import os
import json
import base64
import tempfile
import unittest
from unittest.mock import patch

import cv2
import numpy as np

import app as app_module
import database as database_module


class FakeCamera:
    def read(self):
        return False, None

    def release(self):
        return None


class CaptureFaceTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)

        self.db_path = os.path.join(self.temp_dir.name, 'test.db')
        database_module.DB_PATH = self.db_path
        database_module.init_db()

        app_module.DATASET_DIR = os.path.join(self.temp_dir.name, 'dataset')
        app_module.TRAINER_PATH = os.path.join(self.temp_dir.name, 'trainer.yml')
        app_module.LABELS_PATH = os.path.join(self.temp_dir.name, 'labels.json')
        os.makedirs(app_module.DATASET_DIR, exist_ok=True)

        conn = database_module.get_db()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO students (name, roll_no, class) VALUES (?, ?, ?)', ('Alice', '1', 'A'))
        self.student_id = cursor.lastrowid
        conn.commit()
        conn.close()

        self.client = app_module.app.test_client()

    def test_capture_endpoint_saves_uploaded_image(self):
        image = np.zeros((80, 80, 3), dtype=np.uint8)
        _, encoded = cv2.imencode('.jpg', image)
        image_bytes = encoded.tobytes()
        encoded_b64 = base64.b64encode(image_bytes).decode('ascii')
        payload = {'image': f'data:image/jpeg;base64,{encoded_b64}'}

        class FakeCascade:
            def detectMultiScale(self, *args, **kwargs):
                return [(0, 0, 10, 10)]

        with patch.object(app_module, 'FACE_CASCADE', FakeCascade()):
            response = self.client.post(f'/api/students/{self.student_id}/capture', json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        student_dir = os.path.join(app_module.DATASET_DIR, str(self.student_id))
        self.assertTrue(os.path.isdir(student_dir))
        self.assertTrue(any(name.endswith('.jpg') for name in os.listdir(student_dir)))

    def test_recognition_endpoint_uses_uploaded_image(self):
        image = np.zeros((80, 80, 3), dtype=np.uint8)
        _, encoded = cv2.imencode('.jpg', image)
        image_bytes = encoded.tobytes()
        encoded_b64 = base64.b64encode(image_bytes).decode('ascii')
        payload = {'image': f'data:image/jpeg;base64,{encoded_b64}'}

        with open(app_module.TRAINER_PATH, 'w') as handle:
            handle.write('dummy')
        with open(app_module.LABELS_PATH, 'w') as handle:
            json.dump({str(self.student_id): str(self.student_id)}, handle)

        class FakeCascade:
            def detectMultiScale(self, *args, **kwargs):
                return [(0, 0, 10, 10)]

        class FakeRecognizer:
            def read(self, path):
                return None

            def predict(self, image):
                return self.student_id, 10

        fake_recognizer = FakeRecognizer()
        fake_recognizer.student_id = self.student_id

        with patch.object(app_module, 'FACE_CASCADE', FakeCascade()), \
             patch.object(app_module.cv2.face, 'LBPHFaceRecognizer_create', return_value=fake_recognizer):
            response = self.client.post('/api/attendance/recognize', json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertIn('marked Present', data['message'])


if __name__ == '__main__':
    unittest.main()
