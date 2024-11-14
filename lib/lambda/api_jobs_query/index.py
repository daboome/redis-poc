import boto3
import json
import logging
import os
from typing import Any
import decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ['TABLE_NAME']

def decimal_default(obj: Any) -> Any:
    if isinstance(obj, decimal.Decimal):
        return int(obj)
    raise TypeError

def handler(event, context):
    logger.info(event)
    # Initialize a session using Amazon DynamoDB
    dynamodb = boto3.resource('dynamodb')
    
    # Select your DynamoDB table
    table = dynamodb.Table(TABLE_NAME)
    
    # Get the exam field from the event
    exam = event.get('queryStringParameters', {}).get('exam')
    
    if not exam:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing exam field in the event')
        }
    
    # Query the table using the exam partition key
    response = table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key('exam').eq(exam)
    )
    
    # Get the items from the response
    jobs = response.get('Items', [])
    
    return {
        'statusCode': 200,
        'body': json.dumps(jobs, default=decimal_default)
    }