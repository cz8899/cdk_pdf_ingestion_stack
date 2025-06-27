# Minimal Dockerfile for testing
FROM public.ecr.aws/docker/library/python:3.12-slim

WORKDIR /app
COPY chatbot/requirements.txt /app/
RUN pip install -r requirements.txt --no-cache-dir

COPY chatbot/agent.py /app/
COPY chatbot/utils.py /app/

CMD ["streamlit", "run", "agent.py", "--server.headless", "true", "--browser.serverAddress=0.0.0.0"]