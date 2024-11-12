import boto3
import redis
import json
import logging
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('YourDynamoDBTableName')

# Initialize Redis client
redis_client = redis.StrictRedis(host='localhost', port=6379, db=0)

def query_dynamodb_by_exam(exam):
    response = table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key('exam').eq(exam)
    )
    return response['Items']

def store_results_in_redis(exam, items):
    redis_key = f"exam:{exam}"
    redis_map = {item['jobId']: json.dumps(item) for item in items}
    redis_client.hmset(redis_key, redis_map)

def search_in_redis(exam, search_criteria):
    redis_key = f"exam:{exam}"
    items = redis_client.hgetall(redis_key)
    matching_items = []

    for job_id, item_json in items.items():
        item = json.loads(item_json)
        if all(item.get(key) == value for key, value in search_criteria.items()):
            matching_items.append(item)

    return matching_items

def handler(event, context):
    REDIS_HOST = os.environ['REDIS_HOST']
    REDIS_PORT = os.environ['REDIS_PORT']
    
    exam = event['exam']  # Replace with your exam value
    items = query_dynamodb_by_exam(exam)
    for item in items:
        logger.info(item)
    # store_results_in_redis(exam, items)
    # logger.info(f"Stored {len(items)} items in Redis for exam '{exam}'.")

    # # Example search criteria
    # search_criteria = {
    #     'key1': 'value1',
    #     'key2': 'value2'
    # }
    # matching_items = search_in_redis(exam, search_criteria)
    # logger.info(f"Found {len(matching_items)} matching items.")

# def main():
#     exam = 'example_exam'  # Replace with your exam value
#     items = query_dynamodb_by_exam(exam)
#     store_results_in_redis(exam, items)
#     print(f"Stored {len(items)} items in Redis for exam '{exam}'.")

#     # Example search criteria
#     search_criteria = {
#         'key1': 'value1',
#         'key2': 'value2'
#     }
#     matching_items = search_in_redis(exam, search_criteria)
#     print(f"Found {len(matching_items)} matching items.")
#     for item in matching_items:
#         print(item)

# if __name__ == "__main__":
#     main()