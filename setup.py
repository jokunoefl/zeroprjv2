from setuptools import setup, find_packages

setup(
    name="zerobasics-api",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.110.0",
        "uvicorn==0.27.1",
        "sqlalchemy==2.0.30",
        "pydantic==2.7.1",
        "aiosqlite==0.20.0",
        "psycopg2-binary==2.9.9",
    ],
    python_requires=">=3.11",
)
