FROM python:3.12-slim

WORKDIR /code

COPY . /code

RUN apt-get update \
    && apt-get -y install tesseract-ocr ffmpeg libsm6 libxext6 poppler-utils ghostscript

ENV TESSDATA_PREFIX /usr/share/tesseract-ocr/5/tessdata

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

CMD ["uvicorn", "app.app:mds", "--reload", "--host", "0.0.0.0", "--port", "80"]
