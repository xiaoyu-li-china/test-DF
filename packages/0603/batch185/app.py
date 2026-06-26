from flask import Flask, request, jsonify, send_file, Response
from werkzeug.utils import secure_filename
import os
import re
import json
import uuid
import magic

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
CHUNK_FOLDER = 'chunks'
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png'}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['CHUNK_FOLDER'] = CHUNK_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CHUNK_FOLDER, exist_ok=True)

def allowed_file(file):
    file_content = file.read()
    file.seek(0)
    mime_type = magic.from_buffer(file_content, mime=True)
    return mime_type in ALLOWED_MIME_TYPES

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file):
        original_filename = secure_filename(file.filename)
        _, ext = os.path.splitext(original_filename)
        new_filename = f"{uuid.uuid4().hex}{ext.lower()}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)
        file.save(filepath)

        file_url = f"{request.host_url}{filepath}"

        return jsonify({
            'message': 'File uploaded successfully',
            'original_filename': original_filename,
            'saved_filename': new_filename,
            'url': file_url
        }), 200
    else:
        return jsonify({'error': 'Invalid file type. Only jpg, jpeg, and png are allowed'}), 400

@app.route('/upload/chunk', methods=['POST'])
def upload_chunk():
    upload_id = request.form.get('upload_id')
    chunk_index = request.form.get('chunk_index')
    total_chunks = request.form.get('total_chunks')
    original_name = request.form.get('original_name', '')

    if not all([upload_id, chunk_index, total_chunks]):
        return jsonify({'error': 'Missing required fields: upload_id, chunk_index, total_chunks'}), 400

    try:
        chunk_index = int(chunk_index)
        total_chunks = int(total_chunks)
    except ValueError:
        return jsonify({'error': 'chunk_index and total_chunks must be integers'}), 400

    if 'file' not in request.files:
        return jsonify({'error': 'No chunk file part'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected chunk file'}), 400

    chunk_dir = os.path.join(app.config['CHUNK_FOLDER'], secure_filename(upload_id))
    os.makedirs(chunk_dir, exist_ok=True)

    meta_path = os.path.join(chunk_dir, 'meta.json')
    if not os.path.exists(meta_path):
        with open(meta_path, 'w') as f:
            json.dump({
                'original_name': secure_filename(original_name),
                'total_chunks': total_chunks
            }, f)

    chunk_filename = f"{chunk_index:06d}"
    chunk_path = os.path.join(chunk_dir, chunk_filename)
    file.save(chunk_path)

    received_chunks = [f for f in os.listdir(chunk_dir) if f != 'meta.json']

    return jsonify({
        'message': f'Chunk {chunk_index}/{total_chunks} uploaded',
        'upload_id': upload_id,
        'chunk_index': chunk_index,
        'received_chunks': len(received_chunks),
        'total_chunks': total_chunks
    }), 200

@app.route('/upload/complete', methods=['POST'])
def complete_upload():
    data = request.get_json()
    if not data or 'upload_id' not in data:
        return jsonify({'error': 'Missing upload_id'}), 400

    upload_id = secure_filename(data['upload_id'])
    chunk_dir = os.path.join(app.config['CHUNK_FOLDER'], upload_id)

    if not os.path.exists(chunk_dir):
        return jsonify({'error': 'Upload session not found'}), 404

    meta_path = os.path.join(chunk_dir, 'meta.json')
    with open(meta_path, 'r') as f:
        meta = json.load(f)

    total_chunks = meta['total_chunks']
    original_name = meta.get('original_name', '')

    chunk_files = sorted([f for f in os.listdir(chunk_dir) if f != 'meta.json'])
    if len(chunk_files) != total_chunks:
        return jsonify({
            'error': 'Incomplete upload',
            'expected': total_chunks,
            'received': len(chunk_files)
        }), 400

    _, ext = os.path.splitext(original_name)
    final_filename = f"{uuid.uuid4().hex}{ext.lower()}"
    final_path = os.path.join(app.config['UPLOAD_FOLDER'], final_filename)

    with open(final_path, 'wb') as outfile:
        for chunk_name in chunk_files:
            chunk_path = os.path.join(chunk_dir, chunk_name)
            with open(chunk_path, 'rb') as infile:
                while True:
                    block = infile.read(CHUNK_SIZE)
                    if not block:
                        break
                    outfile.write(block)

    with open(final_path, 'rb') as f:
        head = f.read(4096)
        mime_type = magic.from_buffer(head, mime=True)
    if mime_type not in ALLOWED_MIME_TYPES:
        os.remove(final_path)
        return jsonify({'error': f'Invalid file MIME type: {mime_type}. Only jpg and png are allowed'}), 400

    for chunk_name in chunk_files:
        os.remove(os.path.join(chunk_dir, chunk_name))
    os.remove(meta_path)
    os.rmdir(chunk_dir)

    file_url = f"{request.host_url}download/{final_filename}"

    return jsonify({
        'message': 'File assembled successfully',
        'original_filename': original_name,
        'saved_filename': final_filename,
        'url': file_url
    }), 200

@app.route('/download/<filename>', methods=['GET', 'HEAD'])
def download_file(filename):
    filename = secure_filename(filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404

    file_size = os.path.getsize(filepath)
    range_header = request.headers.get('Range')

    if range_header:
        range_match = re.match(r'bytes=(\d+)-(\d*)', range_header)
        if not range_match:
            return jsonify({'error': 'Invalid Range header'}), 416

        start = int(range_match.group(1))
        end = int(range_match.group(2)) if range_match.group(2) else file_size - 1

        if start >= file_size or end >= file_size or start > end:
            return jsonify({'error': 'Requested range not satisfiable'}), 416

        content_length = end - start + 1

        def generate():
            with open(filepath, 'rb') as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    read_size = min(CHUNK_SIZE, remaining)
                    data = f.read(read_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        response = Response(generate(), 206, mimetype='application/octet-stream')
        response.headers.add('Content-Range', f'bytes {start}-{end}/{file_size}')
        response.headers.add('Content-Length', str(content_length))
        response.headers.add('Accept-Ranges', 'bytes')
        response.headers.add('Content-Disposition', f'attachment; filename="{filename}"')
        return response

    response = send_file(filepath, as_attachment=True)
    response.headers.add('Accept-Ranges', 'bytes')
    response.headers.add('Content-Length', str(file_size))
    return response

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'File too large. Maximum size is 5MB'}), 413

if __name__ == '__main__':
    app.run(debug=True)
