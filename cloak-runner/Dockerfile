FROM cloakhq/cloakbrowser:latest

WORKDIR /app/runner

COPY server.py /app/runner/server.py
COPY scripts /app/runner/scripts

EXPOSE 8765

CMD ["python", "/app/runner/server.py"]
