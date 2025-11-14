from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class DBConnection(BaseModel):
    host: str
    port: int
    user: str
    password: str
    database: str

@app.post("/api/connect")
def get_connection(conn_data: DBConnection):
    """
    Attempt to connect to the database with provided credentials.
    Returns success or error message.
    """
    try:
        # Use the reusable get_connection function
        conn = get_connection(
            host=conn_data.host,
            port=conn_data.port,
            user=conn_data.user,
            password=conn_data.password,
            database=conn_data.database
        )
        conn.close()
        return {"status": "success", "message": "Connected to database successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect: {str(e)}")
