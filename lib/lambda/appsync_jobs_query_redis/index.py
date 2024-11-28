import boto3
import redis
import json
import logging
import os
from typing import Any
import decimal
import time
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

REDIS_HOST = os.environ['REDIS_HOST']
REDIS_PORT = os.environ['REDIS_PORT']
TABLE_NAME = os.environ['TABLE_NAME']

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)

# Initialize Redis client
redis_client = redis.StrictRedis(host=REDIS_HOST, port=REDIS_PORT, db=0)

def query_limited_items(exam_name: str, limit: int) -> list:
    total_items = []
    last_evaluated_key = None

    while len(total_items) < limit:
        response = table.query(
            KeyConditionExpression=Key('exam').eq(exam_name),
            Limit=min(limit - len(total_items), 1000),
            ExclusiveStartKey=last_evaluated_key
        ) if last_evaluated_key else table.query(
            KeyConditionExpression=Key('exam').eq(exam_name),
            Limit=min(limit - len(total_items), 1000)
        )

        total_items.extend(response['Items'])

        if 'LastEvaluatedKey' not in response:
            break

        last_evaluated_key = response['LastEvaluatedKey']

    return total_items

def decimal_default(obj: Any) -> Any:
    if isinstance(obj, decimal.Decimal):
        return int(obj)
    raise TypeError

def query_dynamodb_by_exam(exam):
    response = table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key('exam').eq(exam)
    )
    return response['Items']

def store_results_in_redis(exam, items):
    hash_key = f"exam:{exam}"
    redis_map = {int(item['jobId']): json.dumps(item, default=decimal_default) for item in items}
    redis_client.hmset(hash_key, redis_map)
    redis_client.expire(hash_key, 60)  # Set TTL for the hash

def query_in_redis(exam, search_criteria):
    hash = f"exam:{exam}"
    items = redis_client.hgetall(hash)
    matching_items = []
    matching_items_count = 0

    for _, item_json in items.items():
        item = json.loads(item_json)
        if all(item.get(key) == value for key, value in search_criteria.items()):
            matching_items.append(item)
            matching_items_count += 1

    return matching_items, matching_items_count

def get_query_request_value(event, key, default=None):
    value = event.get(key)
    if value == 'None' or value is None:
        return default
    return value

def filter_query_criteria(query_criteria):
    return {key: value for key, value in query_criteria.items() if value}

def handler(event, context):
    start_time = time.time()  # Start time measurement 
    logger.info(event)    
    
    arguments = event.get('arguments')
    
    if not arguments:
        logger.error("Missing arguments in event.")
        raise ValueError("Missing arguments in event.")
    
    query_request = arguments.get('queryRequest')
    
    if not query_request:
        logger.error("Missing query_request in arguments.")
        raise ValueError("Missing query_request in arguments.")
    
    raw_query = {}
    
    raw_query['exam'] = get_query_request_value(query_request, 'exam')
    raw_query['jobId'] = get_query_request_value(query_request, 'jobId')
    raw_query['jobStatus'] = get_query_request_value(query_request, 'jobStatus')
    raw_query['jobType'] = get_query_request_value(query_request, 'jobType')
    raw_query['jobDescription'] = get_query_request_value(query_request, 'jobDescription')
    
    query_criteria = filter_query_criteria(raw_query)
    
    exam = query_criteria['exam']
    limit = query_request.get('limit', 1000)
    
    hash = f"exam:{exam}"
    
    if redis_client.hlen(hash) > 0:
        logger.info(f"Exam '{exam}' found in Redis.")
    else:
        logger.info(f"Exam '{exam}' not found in Redis. Querying DynamoDB.")
        limited_items = query_limited_items(exam, limit)
        store_results_in_redis(exam, limited_items)
        logger.info(f"Stored {len(limited_items)} items in Redis for exam '{exam}'.")

    matching_items, matching_items_count = query_in_redis(exam, query_criteria)
    logger.info(f"Found {len(matching_items)} matching items.")
    for item in matching_items:
        logger.info(item)
    
    end_time = time.time()  # End time measurement
    elapsed_time = end_time - start_time
        
    return {
        'jobs': matching_items,
        'jobsCount': matching_items_count,
        'elapsedTime': elapsed_time
    }