import logging
import os
from typing import Any
import decimal
import requests

logger = logging.getLogger()
logger.setLevel(logging.INFO)

API_ENDPOINT = os.environ['API_ENDPOINT']

def decimal_default(obj: Any) -> Any:
    if isinstance(obj, decimal.Decimal):
        return str(obj)
    raise TypeError

def query_in_response(items, search_criteria):
    matching_items = []

    for item in items:
        if all(item.get(key) == value for key, value in search_criteria.items()):
            matching_items.append(item)

    return matching_items

def handler(event, context):
    logger.info(event)    
    exam = event['exam']
    query_criteria = event['queryCriteria']
    
    response = requests.get(f"{API_ENDPOINT}/query-jobs", params={"exam": exam})
    items = response.json()    

    matching_items = query_in_response(items, query_criteria)
    logger.info(f"Found {len(matching_items)} matching items.")
    for item in matching_items:
        logger.info(item)
        
    return matching_items