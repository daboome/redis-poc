import boto3
import redis
import json
import logging
import os
from typing import Any
import decimal
import time

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
    hash = f"exam:{exam}"
    redis_map = {int(item['jobId']): json.dumps(item, default=decimal_default) for item in items}
    redis_client.hmset(hash, redis_map)

def query_in_redis(exam, search_criteria):
    hash = f"exam:{exam}"
    items = redis_client.hgetall(hash)
    matching_items = []

    for _, item_json in items.items():
        item = json.loads(item_json)
        if all(item.get(key) == value for key, value in search_criteria.items()):
            matching_items.append(item)

    return matching_items

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
    
    hash = f"exam:{exam}"
    
    if redis_client.hlen(hash) > 0:
        logger.info(f"Exam '{exam}' found in Redis.")
    else:
        logger.info(f"Exam '{exam}' not found in Redis. Querying DynamoDB.")
        items = query_dynamodb_by_exam(exam)
        store_results_in_redis(exam, items)
        logger.info(f"Stored {len(items)} items in Redis for exam '{exam}'.")

    matching_items = query_in_redis(exam, query_criteria)
    logger.info(f"Found {len(matching_items)} matching items.")
    for item in matching_items:
        logger.info(item)
    
    end_time = time.time()  # End time measurement
    elapsed_time = end_time - start_time
        
    return {
        'jobs': matching_items,
        'elapsedTime': elapsed_time
    }