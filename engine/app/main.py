try:
    import logging
    import colorlog
    import logging.config
    import os
    import sys
    if __debug__:
        logging.config.fileConfig('logging.conf')
        logger = colorlog.getLogger('loggingUser')
    from flask import Flask
    from flask import json
    from flask import request
    import cv2
    import numpy as np
    import pymongo
    from pymongo import MongoClient
    import face_recognition

except Exception as e:
    logging.warning("Error while importing librearies {}".format(e))
    sys.exit()


app = Flask(__name__)
client = MongoClient('mongodb://10.10.1.10:27017/')
db = client['rekognition']
collection = db['user']


@app.route("/compare", methods=['POST'])
def compare():
    data  = {
        "user": "",
        "success": False,
        "face": [],
    }
    response = app.response_class(
        mimetype='application/json'
    )
    imagefile = request.files['file']
    number = request.form['id']

    try:
        image = imagefile.read()
        face = get_vector(image)
        user_id, reference_vector = get_user(number)

        result = compare(face, reference_vector)
        data['face'] = str(face[0])
        data['success'] = result
        data['user'] = user_id
    except Exception as e:
        logging.warning('Error {}'.format(e))
        response.status_code = (500)
        return response
    else:
        response.status_code = (200)
    finally:
        response.response = json.dumps(data)
        return response



@app.route("/search", methods=['POST'])
def search():
    data = {
        "user": "",
        "success": False,
        "face": [],
        "telephone": "0",
    }
    response = app.response_class(
        mimetype='application/json'
    )
    imagefile = request.files['file']

    try:
        image = imagefile.read()
        face = get_vector(image)

        success, user, telephone = search_user(face[0])
        data['user'] = user
        data['success'] = success
        data['face'] = str(face[0])
        data['telephone'] = telephone

    except Exception as e:
        logging.warning('Error {}'.format(e))
        response.status_code = (500)
    else:
        response.status_code = (200)
    finally:
        response.response = json.dumps(data)
        return response


@app.route("/register", methods=['POST'])
def register():
    data = {
        "face": [],
    }
    response = app.response_class(
        mimetype='application/json'
    )
    imagefile = request.files['file']
    
    try:
        image = imagefile.read()
        face = get_vector(image)
        if face:
            data['face'] = str(face[0])
        else:
            data['face'] = ''
        logging.debug('data {} '.format(json.dumps(data)))

    except Exception as e:
        logging.warning('Error {}'.format(e))
        response.status_code = (500)
    else:
        response.status_code = (200)
    finally:

        response.response = json.dumps(data)
        return response


def get_vector(photo):
    logging.debug('Photo '.format(photo))
    try:
        nparr = np.fromstring(photo, np.uint8)
        img = cv2.imdecode(nparr, -1)
        logging.debug('img '.format(img))

        small_frame = cv2.resize(img, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = small_frame[:, :, ::-1]
        face_location = face_recognition.face_locations(rgb_small_frame)
        face = face_recognition.face_encodings(rgb_small_frame, face_location)
    except Exception as e:
        logging.warning('Error {}'.format(e))
        faces = list()
    finally:
        logging.debug('faces '.format(face))
        return face


def search_user(face_vector):
    logging.debug('search user')
    logging.debug('db {} '.format(db.list_collection_names()))
    
    database = db.face.find({})
    logging.debug('faces {} '.format(collection.find_one()))

    for face in database:
        logging.debug('Current face {} '.format(user))
        searching_vector = face
        if compare_user(face_vector, searching_vector):
            success = True
            user_id = user['id']
            telephone = user['telephone']

    success = False
    user_id = ''
    telephone = ''
    return success, user_id, telephone
            

def get_user(telephone):
    logging.debug('get user')
    db.face.find_one({'telephone':telephone})
    user = database(telephone)

    return user_id, vector


def compare_user(face_vector1, face_vector2):
    logging.debug('compare user')
    if face_recognition.compare_faces(face_vector1, face_vector2, 0.75):
        return True
    else:
        return False


if __name__ == "__main__":
    # Only for debugging while developing
    app.run(host="0.0.0.0", debug=True, port=80)
