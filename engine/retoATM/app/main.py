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
    import codecs
    import pymongo
    from pymongo import MongoClient
    import face_recognition

except Exception as e:
    logging.warning("Error while importing librearies {}".format(e))
    sys.exit()


app = Flask(__name__)
client = MongoClient('mongodb://localhost:27017/')
db = client['rekognition']
col = db['user']


@app.route("/compare", methods=['POST'])
def compare():
    data  = {
        "success": False,
    }
    response = app.response_class(
        mimetype='application/json'
    )
    imagefile = request.files['file']
    logging.debug('files = {}'.format(imagefile))
    imagefile1 = request.files['file1']
    logging.debug('files = {}'.format(imagefile1))
    image1 = imagefile.read()
    image2 = imagefile1.read()

    try:
        #face1 = get_vector(image1)
        #face2 = get_vector(image2)
        #logging.debug('face1 {} face2 {}'.format(face1, face2))
 
        result = compare_user(image1, image2)
        data['success'] = result
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


@app.route("/registerdev", methods=['POST'])
def registerdev():
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
        t = face.tolist()
        logging.debug('data {} '.format(t))

        if face:
            data['face'] = face[0]
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
        logging.debug('faces {}'.format(face))
        logging.debug('faces {}'.format(face[0]))
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


def compare_user(face_image1, face_image2):
    logging.debug('compare user')

    try:
        nparr = np.fromstring(face_image1, np.uint8)
        img = cv2.imdecode(nparr, -1)
        logging.debug('img '.format(img))

        small_frame = cv2.resize(img, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = small_frame[:, :, ::-1]
        face_location1 = face_recognition.face_locations(rgb_small_frame)
        face1 = face_recognition.face_encodings(rgb_small_frame, face_location1)[0]

        nparr2 = np.fromstring(face_image2, np.uint8)
        img2 = cv2.imdecode(nparr2, -1)
        small_frame2 = cv2.resize(img2, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame2 = small_frame2[:, :, ::-1]
        face_location2 = face_recognition.face_locations(rgb_small_frame2)
        face2 = face_recognition.face_encodings(rgb_small_frame, face_location2)[0]
        logging.debug('img '.format(img2))

        if face_recognition.compare_faces([face1], face2, 0.75):
            return True
        else:
            return False
    except Exception as e:
        logging.warning('Error {}'.format(e))
        return False


if __name__ == "__main__":
    # Only for debugging while developing
    app.run(host="0.0.0.0", debug=True, port=80)
