import boto3
import json
import logging
import os
from typing import Any
import decimal
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ['TABLE_NAME']

# Initialize a session using Amazon DynamoDB
dynamodb = boto3.resource('dynamodb')

# Select your DynamoDB table
table = dynamodb.Table(TABLE_NAME)

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

def handler(event, context):
    logger.info(event)
    
    # Get the exam field from the event
    exam = event.get('queryStringParameters', {}).get('exam')
    limit = int(event.get('queryStringParameters', {}).get('limit', 1000))
    
    if not exam:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing exam field in the event')
        }
    
    limited_items = query_limited_items(exam, limit)
    
    return {
        'statusCode': 200,
        'body': json.dumps(limited_items, default=decimal_default)
    }