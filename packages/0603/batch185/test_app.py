import pytest
import io
import os
from app import app


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestUploadEndpoint:

    def test_normal_upload_jpg(self, client):
        jpeg_header = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb'
        data = {
            'file': (io.BytesIO(jpeg_header + b'x' * 1000), 'test.jpg')
        }
        response = client.post('/upload', data=data, content_type='multipart/form-data')

        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['message'] == 'File uploaded successfully'
        assert 'original_filename' in json_data
        assert 'saved_filename' in json_data
        assert 'url' in json_data
        assert json_data['original_filename'] == 'test.jpg'
        assert json_data['saved_filename'].endswith('.jpg')

        saved_path = os.path.join(app.config['UPLOAD_FOLDER'], json_data['saved_filename'])
        assert os.path.exists(saved_path)

    def test_normal_upload_png(self, client):
        png_header = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        data = {
            'file': (io.BytesIO(png_header + b'x' * 1000), 'image.png')
        }
        response = client.post('/upload', data=data, content_type='multipart/form-data')

        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['original_filename'] == 'image.png'
        assert json_data['saved_filename'].endswith('.png')

    def test_file_too_large(self, client):
        app.config['MAX_CONTENT_LENGTH'] = 100

        jpeg_header = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb'
        large_content = jpeg_header + b'x' * 10000

        data = {
            'file': (io.BytesIO(large_content), 'large.jpg')
        }
        response = client.post('/upload', data=data, content_type='multipart/form-data')

        assert response.status_code == 413
        json_data = response.get_json()
        assert 'File too large' in json_data['error']

        app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

    def test_invalid_file_type_txt(self, client):
        data = {
            'file': (io.BytesIO(b'Hello, this is a text file'), 'fake.jpg')
        }
        response = client.post('/upload', data=data, content_type='multipart/form-data')

        assert response.status_code == 400
        json_data = response.get_json()
        assert 'Invalid file type' in json_data['error']

    def test_invalid_file_type_exe(self, client):
        exe_content = b'MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00\xb8\x00\x00\x00'
        data = {
            'file': (io.BytesIO(exe_content), 'malware.jpg')
        }
        response = client.post('/upload', data=data, content_type='multipart/form-data')

        assert response.status_code == 400
        json_data = response.get_json()
        assert 'Invalid file type' in json_data['error']

    def test_filename_injection_attack(self, client):
        jpeg_header = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb'

        malicious_filename = '../../../etc/passwd.jpg'
        data = {
            'file': (io.BytesIO(jpeg_header + b'x' * 100), malicious_filename)
        }
        response = client.post('/upload', data=data, content_type='multipart/form-data')

        assert response.status_code == 200
        json_data = response.get_json()

        assert '..' not in json_data['original_filename']
        assert '..' not in json_data['saved_filename']
        assert '/' not in json_data['original_filename']
        assert '/' not in json_data['saved_filename']
        assert 'passwd' in json_data['original_filename'] or 'passwd.jpg' in json_data['original_filename']

        saved_path = os.path.join(app.config['UPLOAD_FOLDER'], json_data['saved_filename'])
        assert os.path.exists(saved_path)
        assert os.path.abspath(saved_path).startswith(os.path.abspath(app.config['UPLOAD_FOLDER']))

    def test_filename_injection_script_tag(self, client):
        jpeg_header = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb'

        xss_filename = '<script>alert("xss")</script>.jpg'
        data = {
            'file': (io.BytesIO(jpeg_header + b'x' * 100), xss_filename)
        }
        response = client.post('/upload', data=data, content_type='multipart/form-data')

        assert response.status_code == 200
        json_data = response.get_json()

        assert '<' not in json_data['saved_filename']
        assert '>' not in json_data['saved_filename']

        saved_path = os.path.join(app.config['UPLOAD_FOLDER'], json_data['saved_filename'])
        assert os.path.exists(saved_path)

    def test_no_file_part(self, client):
        response = client.post('/upload', data={}, content_type='multipart/form-data')

        assert response.status_code == 400
        json_data = response.get_json()
        assert 'No file part' in json_data['error']

    def test_empty_filename(self, client):
        data = {
            'file': (io.BytesIO(b'content'), '')
        }
        response = client.post('/upload', data=data, content_type='multipart/form-data')

        assert response.status_code == 400
        json_data = response.get_json()
        assert 'No selected file' in json_data['error']
