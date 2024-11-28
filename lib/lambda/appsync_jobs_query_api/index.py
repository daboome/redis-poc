import logging
import os
from typing import Any
import requests
import time

logger = logging.getLogger()
logger.setLevel(logging.INFO)

API_ENDPOINT = os.environ['API_ENDPOINT']

def query_in_response(items, search_criteria):
    matching_items = []
    matching_items_count = 0

    for item in items:
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
    
    get_params = {"exam": query_criteria['exam']}
    
    if 'limit' in query_request:
        get_params['limit'] = query_request['limit']
    
    response = requests.get(f"{API_ENDPOINT}/query-jobs", get_params)
    items = response.json()    

    matching_items, matching_items_count = query_in_response(items, query_criteria)
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