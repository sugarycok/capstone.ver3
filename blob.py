from flask import Flask, request, jsonify
import pymysql

app = Flask(__name__)

# MySQL 연결 정보 설정
mysql_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '0000',
    'database': 'capstone',
    'cursorclass': pymysql.cursors.DictCursor
}

# MySQL 연결 함수
def get_mysql_connection():
    return pymysql.connect(**mysql_config)

# 이미지를 데이터베이스에 저장하는 라우트
@app.route('/saveGraph', methods=['POST'])
def save_graph():
    # 요청에서 주식 코드 가져오기
    stock_code = request.form.get('stockCode')

    # 이미지 파일 가져오기
    if 'graphImage' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    graph_image = request.files['graphImage']

    # 파일이 없는 경우 에러 반환
    if graph_image.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # 이미지 파일을 바이너리 형태로 읽어옴
        graph_image_blob = graph_image.read()

        # MySQL 연결
        connection = get_mysql_connection()
        cursor = connection.cursor()

        # 데이터베이스에 이미지 저장
        insert_query = "INSERT INTO graphs (stock_code, graph_image) VALUES (%s, %s)"
        cursor.execute(insert_query, (stock_code, graph_image_blob))
        connection.commit()
        cursor.close()
        connection.close()

        return jsonify(success=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
