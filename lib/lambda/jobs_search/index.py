import boto3
import redis
import json
import logging
import os
from typing import Any
import decimal

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
        return str(obj)
    raise TypeError

def query_dynamodb_by_exam(exam):
    response = table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key('exam').eq(exam)
    )
    return response['Items']

def store_results_in_redis(exam, items):
    hash = f"exam:{exam}"
    redis_map = {int(item['jobId']): json.dumps(item, default=decimal_default) for item in items}
    redis_client.hset(hash, redis_map)

def search_in_redis(exam, search_value):
    redis_key = f"exam:{exam}"
    items = redis_client.hgetall(redis_key)
    matching_items = []

    for job_id, item_json in items.items():
        item = json.loads(item_json)
        if any(value == search_value for value in item.values()):
            matching_items.append(item)

    return matching_items

def handler(event, context):    
    exam = event['exam']
    search_value = event['searchValue']
    
    # Check if exam data is present in Redis
    hash = f"exam:{exam}"
    if redis_client.hlen(hash) > 0:
        logger.info(f"Exam '{exam}' found in Redis.")
    else:
        logger.info(f"Exam '{exam}' not found in Redis. Querying DynamoDB.")
        items = query_dynamodb_by_exam(exam)
        store_results_in_redis(exam, items)
        logger.info(f"Stored {len(items)} items in Redis for exam '{exam}'.")

    matching_items = search_in_redis(exam, search_value)
    logger.info(f"Found {len(matching_items)} matching items.")
    for item in matching_items:
        logger.info(item)