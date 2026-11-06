import uvicorn
import threading
import time
import requests

def run_server():
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="error")

# Start server in background thread
t = threading.Thread(target=run_server, daemon=True)
t.start()
time.sleep(3)

# Test login
try:
    r = requests.post('http://localhost:8000/api/v1/auth/login', json={
        'email': 'test@example.com',
        'password': 'testpassword123'
    }, timeout=5)
    print('Login status:', r.status_code)
    print('Login response:', r.text[:300])
except Exception as e:
    print('Login error:', type(e).__name__, str(e))

# Test register
try:
    r = requests.post('http://localhost:8000/api/v1/auth/register', json={
        'email': 'newuser@example.com',
        'full_name': 'New User',
        'password': 'securepassword123',
        'role': 'finance_executive'
    }, timeout=5)
    print('Register status:', r.status_code)
    print('Register response:', r.text[:300])
except Exception as e:
    print('Register error:', type(e).__name__, str(e))

# Keep alive briefly
time.sleep(2)
print('Test complete')