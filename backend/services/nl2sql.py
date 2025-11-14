# services/nl2sql.py
import os
import json
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

# Path to your service account JSON file
SERVICE_ACCOUNT_FILE = "service_account.json"
MODEL_NAME = "gemini-2.5-flash"  # your chosen Gemini model
SCOPES = ["https://www.googleapis.com/auth/generative-language"]


try:
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=SCOPES
    )
except Exception as e:
    print("Error loading credentials:", e)
    raise

def get_access_token() -> str:
    """Refresh and return a valid access token."""
    credentials.refresh(Request())
    return credentials.token

def generate_sql(nl_query: str, schema_info: str = "") -> str:
    """
    Convert a natural language query into a PostgreSQL SQL query using Gemini API.
    """
    access_token = get_access_token()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"

    prompt = f"""
    Convert the following natural language request into a valid PostgreSQL SQL query or if the query is related to database answer it in text and ignore the next db parameters.
    Database schema info:
    {schema_info}

    User request:
    {nl_query}

    SQL query:
    """

    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    response = requests.post(url, headers=headers, json=payload)
    print("Status:", response.status_code)
    print("Response:", response.text)

    result = response.json()

    # Error handling
    if response.status_code != 200:
        raise Exception(f"Gemini API returned an error: {json.dumps(result, indent=2)}")

    try:
        # Correct structure
        sql_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()

        # Clean up code blocks like ```sql ... ```
        if sql_text.startswith("```"):
            sql_text = sql_text.strip("`").replace("sql", "", 1).strip()

        return sql_text
    except (KeyError, IndexError, TypeError):
        raise Exception(f"Unexpected Gemini response format: {json.dumps(result, indent=2)}")
