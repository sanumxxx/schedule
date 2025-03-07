import os
import json
import datetime
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import io
import xlsxwriter
from sqlalchemy import or_, and_

# Инициализация приложения
app = Flask(__name__)
CORS(app)  # Разрешаем CORS для всех маршрутов

# Конфигурация
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///schedule.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Инициализация базы данных
db = SQLAlchemy(app)


# Модели
class Schedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    semester = db.Column(db.Integer, nullable=False)
    week_number = db.Column(db.Integer, nullable=False)
    # Информация о группе
    group_name = db.Column(db.String(20), nullable=False)
    course = db.Column(db.Integer, nullable=False)
    faculty = db.Column(db.String(100))

    # Информация о занятии
    subject = db.Column(db.String(256), nullable=False)
    lesson_type = db.Column(db.String(20))  # тип занятия (лекция, практика и т.д.)
    subgroup = db.Column(db.Integer, default=0)

    # Время занятия
    date = db.Column(db.Date, nullable=False)
    time_start = db.Column(db.String(5), nullable=False)
    time_end = db.Column(db.String(5), nullable=False)
    weekday = db.Column(db.Integer, nullable=False)

    # Место проведения и преподаватель
    teacher_name = db.Column(db.String(100), server_default='')
    auditory = db.Column(db.String(256), server_default='')

    # Метаданные
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'semester': self.semester,
            'week_number': self.week_number,
            'group_name': self.group_name,
            'course': self.course,
            'faculty': self.faculty,
            'subject': self.subject,
            'lesson_type': self.lesson_type,
            'subgroup': self.subgroup,
            'date': self.date.strftime('%Y-%m-%d') if self.date else None,
            # Используем strftime для явного форматирования
            'time_start': self.time_start,
            'time_end': self.time_end,
            'weekday': self.weekday,
            'teacher_name': self.teacher_name,
            'auditory': self.auditory,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        }


class TimeSlot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    slot_number = db.Column(db.Integer, nullable=False)  # For ordering
    time_start = db.Column(db.String(5), nullable=False)
    time_end = db.Column(db.String(5), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'slot_number': self.slot_number,
            'time_start': self.time_start,
            'time_end': self.time_end,
            'is_active': self.is_active,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        }


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='editor')  # admin или editor
    full_name = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'fullName': self.full_name,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }


# Вспомогательные функции
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]

        if not token:
            return jsonify({'message': 'Токен отсутствует!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])

            if not current_user:
                return jsonify({'message': 'Пользователь не найден!'}), 401

        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Токен истек!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Недействительный токен!'}), 401

        return f(current_user, *args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role != 'admin':
            return jsonify({'message': 'Недостаточно прав доступа!'}), 403
        return f(current_user, *args, **kwargs)

    return decorated


def get_dates_for_week(year, week_number):
    # Получаем первый день года
    first_day = datetime(year, 1, 1)

    # Находим первый понедельник года
    if first_day.weekday() != 0:  # 0 - понедельник
        first_monday = first_day + timedelta(days=(7 - first_day.weekday()) % 7)
    else:
        first_monday = first_day

    # Находим понедельник нужной недели
    monday = first_monday + timedelta(weeks=week_number - 1)

    # Формируем словарь с датами на неделю
    dates = {}
    for i in range(6):  # Пн-Сб (6 дней)
        day = monday + timedelta(days=i)
        dates[i + 1] = day.strftime('%Y-%m-%d')

    return dates


# API маршруты

# Инициализация первого администратора
@app.route('/api/auth/init', methods=['POST'])
def init_admin():
    # Проверяем, есть ли уже пользователи
    if User.query.count() > 0:
        return jsonify({'message': 'Первичная инициализация уже выполнена!'}), 400

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Необходимо указать логин и пароль!'}), 400

    # Создаем пользователя-администратора
    admin = User(username=username, role='admin')
    admin.set_password(password)

    db.session.add(admin)
    db.session.commit()

    return jsonify({'message': 'Администратор успешно создан!'}), 201


# Авторизация
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Необходимо указать логин и пароль!'}), 400

    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        return jsonify({'message': 'Неверный логин или пароль!'}), 401

    # Генерируем JWT токен
    token = jwt.encode(
        {
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(hours=24)
        },
        app.config['SECRET_KEY'],
        algorithm='HS256'
    )

    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 200


# Информация о текущем пользователе
@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    return jsonify(current_user.to_dict()), 200


# API для работы с группами
@app.route('/api/groups', methods=['GET'])
def get_groups():
    search = request.args.get('search', '')

    # Получаем уникальные группы из расписания
    query = db.session.query(Schedule.group_name, Schedule.course, Schedule.faculty).distinct()

    if search:
        query = query.filter(Schedule.group_name.ilike(f'%{search}%'))

    groups = query.all()

    result = []
    for group in groups:
        result.append({
            'group_name': group[0],
            'course': group[1],
            'faculty': group[2]
        })

    return jsonify(result), 200


# API для работы с преподавателями
@app.route('/api/teachers', methods=['GET'])
def get_teachers():
    search = request.args.get('search', '')

    # Получаем уникальных преподавателей из расписания
    query = db.session.query(Schedule.teacher_name).distinct().filter(Schedule.teacher_name != '')

    if search:
        query = query.filter(Schedule.teacher_name.ilike(f'%{search}%'))

    teachers = query.all()

    result = []
    for teacher in teachers:
        result.append({
            'teacher_name': teacher[0]
        })

    return jsonify(result), 200

@app.route('/api/time_slots', methods=['GET'])
def get_time_slots():
    slots = TimeSlot.query.order_by(TimeSlot.slot_number).all()
    return jsonify([slot.to_dict() for slot in slots]), 200


# Admin-only endpoints to manage time slots
@app.route('/api/time_slots', methods=['POST'])
@token_required
@admin_required
def create_time_slot(current_user):
    data = request.get_json()

    # Validate required fields
    required_fields = ['time_start', 'time_end']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'message': f'Поле {field} обязательно для заполнения!'}), 400

    # Determine slot_number (put at the end by default)
    max_slot = TimeSlot.query.order_by(TimeSlot.slot_number.desc()).first()
    next_slot_number = 1 if not max_slot else max_slot.slot_number + 1

    # Create new time slot
    new_slot = TimeSlot(
        slot_number=data.get('slot_number', next_slot_number),
        time_start=data['time_start'],
        time_end=data['time_end'],
        is_active=data.get('is_active', True)
    )

    db.session.add(new_slot)
    db.session.commit()

    return jsonify(new_slot.to_dict()), 201


@app.route('/api/time_slots/<int:id>', methods=['PUT'])
@token_required
@admin_required
def update_time_slot(current_user, id):
    slot = TimeSlot.query.get_or_404(id)
    data = request.get_json()

    if 'time_start' in data:
        slot.time_start = data['time_start']
    if 'time_end' in data:
        slot.time_end = data['time_end']
    if 'is_active' in data:
        slot.is_active = data['is_active']
    if 'slot_number' in data:
        slot.slot_number = data['slot_number']

    db.session.commit()

    return jsonify(slot.to_dict()), 200


@app.route('/api/time_slots/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_time_slot(current_user, id):
    slot = TimeSlot.query.get_or_404(id)

    db.session.delete(slot)
    db.session.commit()

    return jsonify({'message': 'Временной слот успешно удален!'}), 200


@app.route('/api/time_slots/reorder', methods=['POST'])
@token_required
@admin_required
def reorder_time_slots(current_user):
    data = request.get_json()

    if not data or not isinstance(data, list):
        return jsonify({'message': 'Ожидается массив с порядком слотов!'}), 400

    # Update slot_number for each item
    for item in data:
        if 'id' in item and 'slot_number' in item:
            slot = TimeSlot.query.get(item['id'])
            if slot:
                slot.slot_number = item['slot_number']

    db.session.commit()

    return jsonify({'message': 'Порядок временных слотов обновлен!'}), 200


@app.route('/api/time_slots/init', methods=['POST'])
@token_required
@admin_required
def init_time_slots(current_user):
    # Check if time slots already exist
    if TimeSlot.query.count() > 0:
        return jsonify({'message': 'Временные слоты уже существуют!'}), 400

    # Default time slots - these match the originally hardcoded values
    default_slots = [
        {'slot_number': 1, 'time_start': '08:00', 'time_end': '09:20'},
        {'slot_number': 2, 'time_start': '09:30', 'time_end': '10:50'},
        {'slot_number': 3, 'time_start': '11:00', 'time_end': '12:20'},
        {'slot_number': 4, 'time_start': '12:40', 'time_end': '14:00'},
        {'slot_number': 5, 'time_start': '14:10', 'time_end': '15:30'},
        {'slot_number': 6, 'time_start': '15:40', 'time_end': '17:00'},
        {'slot_number': 7, 'time_start': '17:10', 'time_end': '18:30'},
        {'slot_number': 8, 'time_start': '18:40', 'time_end': '20:00'}
    ]

    for slot_data in default_slots:
        slot = TimeSlot(**slot_data)
        db.session.add(slot)

    db.session.commit()

    return jsonify({'message': 'Временные слоты успешно инициализированы!'}), 201

# API для работы с аудиториями
@app.route('/api/auditories', methods=['GET'])
def get_auditories():
    search = request.args.get('search', '')

    # Получаем уникальные аудитории из расписания
    query = db.session.query(Schedule.auditory).distinct().filter(Schedule.auditory != '')

    if search:
        query = query.filter(Schedule.auditory.ilike(f'%{search}%'))

    auditories = query.all()

    result = []
    for auditory in auditories:
        result.append({
            'auditory': auditory[0]
        })

    return jsonify(result), 200


# API для работы с расписанием группы
# API для работы с расписанием группы
@app.route('/api/schedule/group/<string:group_name>', methods=['GET'])
def get_group_schedule(group_name):
    try:
        # Получаем параметры из запроса с значениями по умолчанию
        semester = request.args.get('semester', 1, type=int)
        week = request.args.get('week', 1, type=int)

        # Определяем год в зависимости от семестра
        current_date = datetime.now()
        year = current_date.year

        # Логика определения года для семестра
        if semester == 2 and current_date.month < 8:
            # Второй семестр текущего учебного года (весна)
            pass
        elif semester == 1 and current_date.month >= 8:
            # Первый семестр текущего учебного года (осень)
            pass
        else:
            # Корректируем год
            year = year - 1 if semester == 1 else year

        # Получаем расписание для группы на указанную неделю и семестр
        try:
            schedule_items = Schedule.query.filter_by(
                group_name=group_name,
                semester=semester,
                week_number=week
            ).order_by(Schedule.weekday, Schedule.time_start).all()
        except Exception as e:
            # Расширенная обработка ошибок запроса
            app.logger.error(f"Ошибка запроса расписания: {str(e)}")
            return jsonify({'message': 'Ошибка при получении расписания', 'error': str(e)}), 500

        # Получаем даты для недели
        try:
            dates = get_dates_for_week(year, week)
        except Exception as e:
            app.logger.error(f"Ошибка получения дат недели: {str(e)}")
            return jsonify({'message': 'Ошибка при определении дат недели', 'error': str(e)}), 500

        # Преобразуем расписание в словари
        schedule_data = []
        for item in schedule_items:
            item_dict = item.to_dict()

            # Добавляем дополнительную проверку даты
            try:
                # Убеждаемся, что дата корректна и соответствует неделе
                item_date = datetime.strptime(item_dict['date'], '%Y-%m-%d').date()
                weekday = item_date.weekday() + 1  # Приводим к формату где пн=1

                # Проверяем соответствие дня недели
                if weekday != item.weekday:
                    app.logger.warning(f"Несоответствие дня недели для записи {item.id}")
            except Exception as e:
                app.logger.error(f"Ошибка проверки даты для записи {item.id}: {str(e)}")

            schedule_data.append(item_dict)

        return jsonify({
            'schedule': schedule_data,
            'dates': dates
        }), 200

    except Exception as e:
        # Глобальный обработчик непредвиденных ошибок
        app.logger.error(f"Критическая ошибка в get_group_schedule: {str(e)}")
        return jsonify({
            'message': 'Произошла непредвиденная ошибка при получении расписания',
            'error': str(e)
        }), 500


# API для работы с расписанием преподавателя
@app.route('/api/schedule/teacher/<string:teacher_name>', methods=['GET'])
def get_teacher_schedule(teacher_name):
    semester = request.args.get('semester', 1, type=int)
    week = request.args.get('week', 1, type=int)

    # Получаем расписание для преподавателя на указанную неделю и семестр
    schedule_items = Schedule.query.filter_by(
        teacher_name=teacher_name,
        semester=semester,
        week_number=week
    ).order_by(Schedule.weekday, Schedule.time_start).all()

    # Получаем даты для недели
    year = datetime.now().year
    if semester == 2 and datetime.now().month < 8:
        # Второй семестр текущего учебного года (весна)
        pass
    elif semester == 1 and datetime.now().month >= 8:
        # Первый семестр текущего учебного года (осень)
        pass
    else:
        # В другом случае используем предыдущий или следующий год
        if semester == 1:
            year = year - 1
        else:
            year = year

    dates = get_dates_for_week(year, week)

    return jsonify({
        'schedule': [item.to_dict() for item in schedule_items],
        'dates': dates
    }), 200


# API для работы с расписанием аудитории
@app.route('/api/schedule/auditory/<string:auditory>', methods=['GET'])
def get_auditory_schedule(auditory):
    semester = request.args.get('semester', 1, type=int)
    week = request.args.get('week', 1, type=int)

    # Получаем расписание для аудитории на указанную неделю и семестр
    schedule_items = Schedule.query.filter_by(
        auditory=auditory,
        semester=semester,
        week_number=week
    ).order_by(Schedule.weekday, Schedule.time_start).all()

    # Получаем даты для недели
    year = datetime.now().year
    if semester == 2 and datetime.now().month < 8:
        # Второй семестр текущего учебного года (весна)
        pass
    elif semester == 1 and datetime.now().month >= 8:
        # Первый семестр текущего учебного года (осень)
        pass
    else:
        # В другом случае используем предыдущий или следующий год
        if semester == 1:
            year = year - 1
        else:
            year = year

    dates = get_dates_for_week(year, week)

    return jsonify({
        'schedule': [item.to_dict() for item in schedule_items],
        'dates': dates
    }), 200


# Экспорт расписания в Excel
@app.route('/api/schedule/<string:type>/<string:id>/export', methods=['GET'])
def export_schedule(type, id):
    semester = request.args.get('semester', 1, type=int)
    week = request.args.get('week', 1, type=int)

    # Получаем расписание в зависимости от типа
    if type == 'group':
        schedule_items = Schedule.query.filter_by(
            group_name=id,
            semester=semester,
            week_number=week
        ).order_by(Schedule.weekday, Schedule.time_start).all()
        name = f"Расписание группы {id}"
    elif type == 'teacher':
        schedule_items = Schedule.query.filter_by(
            teacher_name=id,
            semester=semester,
            week_number=week
        ).order_by(Schedule.weekday, Schedule.time_start).all()
        name = f"Расписание преподавателя {id}"
    elif type == 'auditory':
        schedule_items = Schedule.query.filter_by(
            auditory=id,
            semester=semester,
            week_number=week
        ).order_by(Schedule.weekday, Schedule.time_start).all()
        name = f"Расписание аудитории {id}"
    else:
        return jsonify({'message': 'Неизвестный тип расписания!'}), 400

    # Получаем даты для недели
    year = datetime.now().year
    dates = get_dates_for_week(year, week)

    # Создаем Excel файл
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    # Форматы для заголовков и ячеек
    header_format = workbook.add_format({
        'bold': True,
        'align': 'center',
        'valign': 'vcenter',
        'bg_color': '#D8D8D8',
        'border': 1
    })

    cell_format = workbook.add_format({
        'align': 'center',
        'valign': 'vcenter',
        'border': 1
    })

    # Заголовки столбцов
    weekdays = ['Время', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

    for col, day in enumerate(weekdays):
        worksheet.write(0, col, day, header_format)
        worksheet.set_column(col, col, 20)

    # Заголовки строк (время пар)
    times = [
        '08:00-09:20',
        '09:30-10:50',
        '11:10-12:30',
        '12:40-14:00',
        '14:10-15:30',
        '15:40-17:00',
        '17:10-18:30',
        '18:40-20:00'
    ]

    for row, time in enumerate(times):
        worksheet.write(row + 1, 0, time, cell_format)

    # Заполняем таблицу данными
    for item in schedule_items:
        # Определяем строку (по времени)
        time_index = -1
        for i, time in enumerate(times):
            start, end = time.split('-')
            if item.time_start == start and item.time_end == end:
                time_index = i
                break

        if time_index == -1:
            continue

        row = time_index + 1
        col = item.weekday

        # Формируем текст ячейки
        cell_text = f"{item.subject}\n"

        if type != 'group':
            cell_text += f"Группа: {item.group_name}\n"

        if type != 'teacher' and item.teacher_name:
            cell_text += f"Преп.: {item.teacher_name}\n"

        if type != 'auditory' and item.auditory:
            cell_text += f"Ауд.: {item.auditory}\n"

        if item.lesson_type:
            cell_text += f"Тип: {item.lesson_type}"

        # Записываем в ячейку
        worksheet.write(row, col, cell_text, cell_format)

    # Заголовок листа
    worksheet.merge_range('A1:G1', name, header_format)
    worksheet.write(0, 0, 'Время', header_format)

    # Даты под днями недели
    for i in range(1, 7):
        if i in dates:
            date_obj = datetime.strptime(dates[i], '%Y-%m-%d')
            formatted_date = date_obj.strftime('%d.%m.%Y')
            worksheet.write(1, i, formatted_date, cell_format)

    workbook.close()

    # Подготавливаем файл для отправки
    output.seek(0)

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f"{type}_{id}_schedule_{semester}_{week}.xlsx"
    )


# CRUD для расписания (требуется авторизация)
@app.route('/api/schedule', methods=['GET'])
@token_required
def get_all_schedule(current_user):
    # Получаем параметры фильтрации
    semester = request.args.get('semester')
    week_number = request.args.get('week_number')
    group_name = request.args.get('group_name')
    teacher_name = request.args.get('teacher_name')
    search = request.args.get('search')

    query = Schedule.query

    # Применяем фильтры
    if semester:
        query = query.filter_by(semester=int(semester))

    if week_number:
        query = query.filter_by(week_number=int(week_number))

    if group_name:
        query = query.filter(Schedule.group_name.ilike(f'%{group_name}%'))

    if teacher_name:
        query = query.filter(Schedule.teacher_name.ilike(f'%{teacher_name}%'))

    if search:
        query = query.filter(
            or_(
                Schedule.subject.ilike(f'%{search}%'),
                Schedule.group_name.ilike(f'%{search}%'),
                Schedule.teacher_name.ilike(f'%{search}%'),
                Schedule.auditory.ilike(f'%{search}%')
            )
        )

    # Сортируем по дню недели и времени
    schedule_items = query.order_by(Schedule.weekday, Schedule.time_start).all()

    return jsonify([item.to_dict() for item in schedule_items]), 200


@app.route('/api/schedule', methods=['POST'])
@token_required
def create_schedule(current_user):
    data = request.get_json()

    # Проверяем обязательные поля
    required_fields = [
        'semester', 'week_number', 'group_name', 'course',
        'subject', 'date', 'time_start', 'time_end', 'weekday'
    ]

    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'message': f'Поле {field} обязательно для заполнения!'}), 400

    # Преобразуем дату из строки в объект Date
    try:
        date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Неверный формат даты! Используйте YYYY-MM-DD.'}), 400

    # Создаем новую запись
    new_item = Schedule(
        semester=data['semester'],
        week_number=data['week_number'],
        group_name=data['group_name'],
        course=data['course'],
        faculty=data.get('faculty', ''),
        subject=data['subject'],
        lesson_type=data.get('lesson_type', ''),
        subgroup=data.get('subgroup', 0),
        date=date,
        time_start=data['time_start'],
        time_end=data['time_end'],
        weekday=data['weekday'],
        teacher_name=data.get('teacher_name', ''),
        auditory=data.get('auditory', '')
    )

    db.session.add(new_item)
    db.session.commit()

    return jsonify(new_item.to_dict()), 201

# Быстрое добавление записи в расписание БЕЗ авторизации
@app.route('/api/quick_add_schedule', methods=['POST'])
def quick_add_schedule():
    # Получаем данные из запроса
    data = request.get_json()

    # Обязательные проверки
    required_fields = [
        'semester', 'week_number', 'group_name', 'course',
        'subject', 'date', 'time_start', 'time_end', 'weekday'
    ]

    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'message': f'Поле {field} обязательно для заполнения!'}), 400

    try:
        # Пытаемся распарсить дату
        try:
            if isinstance(data['date'], str):
                # Попытка распарсить строку
                date_obj = datetime.strptime(data['date'], '%Y-%m-%d').date()
            elif isinstance(data['date'], (int, float)):
                # Если передан timestamp
                date_obj = datetime.fromtimestamp(data['date'] / 1000).date()
            else:
                return jsonify({'message': 'Неверный формат даты'}), 400
        except Exception as e:
            return jsonify({'message': f'Ошибка парсинга даты: {str(e)}'}), 400

        # Создаем новую запись
        new_item = Schedule(
            semester=data['semester'],
            week_number=data['week_number'],
            group_name=data['group_name'],
            course=data['course'],
            faculty=data.get('faculty', ''),
            subject=data['subject'],
            lesson_type=data.get('lesson_type', ''),
            subgroup=data.get('subgroup', 0),
            date=date_obj,
            time_start=data['time_start'],
            time_end=data['time_end'],
            weekday=data['weekday'],
            teacher_name=data.get('teacher_name', ''),
            auditory=data.get('auditory', '')
        )

        # Добавляем и сохраняем
        db.session.add(new_item)
        db.session.commit()

        return jsonify({
            'message': 'Запись успешно добавлена!',
            'id': new_item.id
        }), 201

    except Exception as e:
        # Откатываем транзакцию в случае ошибки
        db.session.rollback()
        return jsonify({
            'message': f'Ошибка при добавлении записи: {str(e)}'
        }), 500


# Анализ файлов расписания
@app.route('/api/schedule/analyze', methods=['POST'])
@token_required
def analyze_schedule_files(current_user):
    try:
        # Проверяем наличие файлов в запросе
        if 'files[]' not in request.files and len(request.files) == 0:
            return jsonify({'message': 'Не найдены файлы в запросе!'}), 400

        # Получаем семестр
        semester = int(request.form.get('semester', 1))

        # Получаем файлы
        files = []
        for key in request.files:
            if key.startswith('files['):
                files.append(request.files[key])

        if len(files) == 0:
            return jsonify({'message': 'Не найдены файлы в запросе!'}), 400

        # Информация о неделях
        weeks_info = {}
        total_lessons = 0

        # Обрабатываем каждый файл
        for file in files:
            try:
                # Читаем файл с учетом кодировки Windows-1251
                content = file.read().decode('windows-1251')

                # Исправляем проблемы с экранированием символов
                # Заменяем одиночные обратные слеши, которые не являются частью корректной escape-последовательности
                import re

                # Экранируем обратные слеши внутри строк
                def fix_backslashes(match):
                    content = match.group(0)
                    # Заменяем одиночные \ на \\, но только если они не экранируют специальные символы
                    # Например, \n, \t, \", \\ уже корректные и их не трогаем
                    return re.sub(r'\\(?!["\\/bfnrt])', r'\\\\', content)

                # Ищем все строковые литералы в JSON и фиксируем в них обратные слеши
                fixed_content = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', fix_backslashes, content)

                # Парсим JSON
                data = json.loads(fixed_content)

                # Проверяем формат данных
                if not isinstance(data, list) or not data or 'timetable' not in data[0]:
                    continue

                timetable = data[0]['timetable']

                # Собираем информацию о неделях
                for week_data in timetable:
                    week_number = week_data.get('week_number')
                    date_start = week_data.get('date_start')
                    date_end = week_data.get('date_end')

                    if week_number is None:
                        continue

                    # Счетчики занятий и групп
                    lessons_count = 0
                    groups_set = set()

                    # Обрабатываем группы и занятия
                    for group_data in week_data.get('groups', []):
                        group_name = group_data.get('group_name')
                        if group_name:
                            groups_set.add(group_name)

                        # Подсчет занятий
                        for day_data in group_data.get('days', []):
                            lessons_count += len(day_data.get('lessons', []))

                    # Проверяем, существуют ли занятия для этой недели в БД
                    existing_lessons = Schedule.query.filter_by(
                        semester=semester,
                        week_number=week_number
                    ).count()

                    status = 'new' if existing_lessons == 0 else 'exists'

                    # Сохраняем информацию о неделе
                    if week_number not in weeks_info:
                        weeks_info[week_number] = {
                            'week_number': week_number,
                            'date_start': date_start,
                            'date_end': date_end,
                            'lessons_count': lessons_count,
                            'groups_count': len(groups_set),
                            'status': status
                        }
                    else:
                        # Обновляем счетчики, если неделя уже встречалась
                        weeks_info[week_number]['lessons_count'] += lessons_count
                        weeks_info[week_number]['groups_count'] += len(groups_set)

                    total_lessons += lessons_count
            except Exception as e:
                # Логируем ошибку для каждого файла, но продолжаем обработку других файлов
                print(f"Ошибка обработки файла {file.filename}: {str(e)}")
                continue

        # Преобразуем словарь в список для ответа
        weeks_list = list(weeks_info.values())

        if not weeks_list:
            return jsonify(
                {'message': 'Не удалось извлечь данные о неделях из загруженных файлов. Проверьте формат файлов.'}), 400

        return jsonify({
            'weeks': weeks_list,
            'total_lessons': total_lessons,
            'files_count': len(files)
        }), 200

    except Exception as e:
        return jsonify({'message': f'Ошибка при анализе файлов: {str(e)}'}), 500


# Импорт расписания из файлов
@app.route('/api/schedule/upload', methods=['POST'])
@token_required
def upload_schedule(current_user):
    try:
        # Проверяем наличие файлов в запросе
        if 'files[]' not in request.files and len(request.files) == 0:
            return jsonify({'message': 'Не найдены файлы в запросе!'}), 400

        # Получаем семестр
        semester = int(request.form.get('semester', 1))

        # Получаем выбранные недели
        weeks_str = request.form.get('weeks', '[]')
        selected_weeks = json.loads(weeks_str)

        if not selected_weeks:
            return jsonify({'message': 'Не выбраны недели для импорта!'}), 400

        # Получаем файлы
        files = []
        for key in request.files:
            if key.startswith('files['):
                files.append(request.files[key])

        if len(files) == 0:
            return jsonify({'message': 'Не найдены файлы в запросе!'}), 400

        # Статистика импорта
        imported_count = 0
        updated_count = 0
        failed_count = 0
        processed_groups = set()

        # Обрабатываем каждый файл
        for file in files:
            try:
                # Читаем файл с учетом кодировки Windows-1251
                content = file.read().decode('windows-1251')

                # Исправляем проблемы с экранированием символов
                import re

                # Экранируем обратные слеши внутри строк
                def fix_backslashes(match):
                    content = match.group(0)
                    # Заменяем одиночные \ на \\, но только если они не экранируют специальные символы
                    return re.sub(r'\\(?!["\\/bfnrt])', r'\\\\', content)

                # Ищем все строковые литералы в JSON и фиксируем в них обратные слеши
                fixed_content = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', fix_backslashes, content)

                # Парсим JSON
                data = json.loads(fixed_content)

                # Проверяем формат данных
                if not isinstance(data, list) or not data or 'timetable' not in data[0]:
                    continue

                timetable = data[0]['timetable']

                # Обрабатываем расписание
                for week_data in timetable:
                    week_number = week_data.get('week_number')

                    # Пропускаем недели, которые не были выбраны
                    if week_number not in selected_weeks:
                        continue

                    # Обрабатываем группы и занятия
                    for group_data in week_data.get('groups', []):
                        group_name = group_data.get('group_name')
                        course = group_data.get('course')
                        faculty = group_data.get('faculty')

                        if not group_name or course is None:
                            continue

                        processed_groups.add(group_name)

                        # Удаляем существующие занятия для этой группы на данной неделе
                        Schedule.query.filter_by(
                            semester=semester,
                            week_number=week_number,
                            group_name=group_name
                        ).delete()

                        # Обрабатываем дни и занятия
                        for day_data in group_data.get('days', []):
                            weekday = day_data.get('weekday')

                            for lesson in day_data.get('lessons', []):
                                try:
                                    # Извлекаем данные о занятии
                                    subject = lesson.get('subject')
                                    lesson_type = lesson.get('type')
                                    subgroup = lesson.get('subgroup', 0)
                                    time_start = lesson.get('time_start')
                                    time_end = lesson.get('time_end')

                                    # Преобразуем дату из строки в объект Date
                                    date_str = lesson.get('date')
                                    if date_str:
                                        # Преобразуем формат даты из DD-MM-YYYY в YYYY-MM-DD
                                        day, month, year = date_str.split('-')
                                        date = datetime.strptime(f"{year}-{month}-{day}", '%Y-%m-%d').date()
                                    else:
                                        # Если даты нет, пропускаем занятие
                                        continue

                                    # Получаем имя преподавателя и аудиторию
                                    teacher_name = ""
                                    auditory = ""

                                    if 'teachers' in lesson and lesson['teachers']:
                                        teacher_name = lesson['teachers'][0].get('teacher_name', '')

                                    if 'auditories' in lesson and lesson['auditories']:
                                        auditory = lesson['auditories'][0].get('auditory_name', '')

                                    # Создаем новую запись
                                    new_item = Schedule(
                                        semester=semester,
                                        week_number=week_number,
                                        group_name=group_name,
                                        course=course,
                                        faculty=faculty or '',
                                        subject=subject or '',
                                        lesson_type=lesson_type or '',
                                        subgroup=subgroup or 0,
                                        date=date,
                                        time_start=time_start or '',
                                        time_end=time_end or '',
                                        weekday=weekday or 0,
                                        teacher_name=teacher_name,
                                        auditory=auditory
                                    )

                                    db.session.add(new_item)
                                    imported_count += 1
                                except Exception as e:
                                    failed_count += 1
                                    print(f"Ошибка импорта занятия: {str(e)}")
                                    continue
            except Exception as e:
                print(f"Ошибка обработки файла {file.filename}: {str(e)}")
                continue

        # Сохраняем изменения
        db.session.commit()

        return jsonify({
            'message': f'Импорт завершен. Добавлено: {imported_count}, не удалось импортировать: {failed_count} занятий.',
            'imported_count': imported_count,
            'updated_count': updated_count,
            'failed_count': failed_count,
            'processed_groups': len(processed_groups)
        }), 200

    except Exception as e:
        return jsonify({'message': f'Ошибка при импорте расписания: {str(e)}'}), 500


# Импорт расписания из JSON (старый метод)
@app.route('/api/schedule/import', methods=['POST'])
@token_required
def import_schedule(current_user):
    # Получаем данные из запроса
    if not request.is_json:
        return jsonify({'message': 'Ожидается JSON!'}), 400

    data = request.get_json()

    if not isinstance(data, list):
        return jsonify({'message': 'Ожидается массив записей расписания!'}), 400

    # Обрабатываем каждую запись
    imported_count = 0
    failed_count = 0

    for item_data in data:
        try:
            # Преобразуем дату из строки в объект Date
            date = datetime.strptime(item_data['date'], '%Y-%m-%d').date()

            # Создаем новую запись
            new_item = Schedule(
                semester=item_data['semester'],
                week_number=item_data['week_number'],
                group_name=item_data['group_name'],
                course=item_data['course'],
                faculty=item_data.get('faculty', ''),
                subject=item_data['subject'],
                lesson_type=item_data.get('lesson_type', ''),
                subgroup=item_data.get('subgroup', 0),
                date=date,
                time_start=item_data['time_start'],
                time_end=item_data['time_end'],
                weekday=item_data['weekday'],
                teacher_name=item_data.get('teacher_name', ''),
                auditory=item_data.get('auditory', '')
            )

            db.session.add(new_item)
            imported_count += 1
        except Exception as e:
            failed_count += 1
            continue

    # Сохраняем изменения
    db.session.commit()

    return jsonify({
        'message': f'Импорт завершен. Успешно импортировано: {imported_count}, не удалось импортировать: {failed_count} записей.',
        'imported_count': imported_count,
        'failed_count': failed_count
    }), 200


@app.route('/api/schedule/<int:id>', methods=['DELETE'])
@token_required
def delete_schedule(current_user, id):
    item = Schedule.query.get_or_404(id)

    db.session.delete(item)
    db.session.commit()

    return jsonify({'message': 'Запись успешно удалена!'}), 200


# CRUD для пользователей (только для администраторов)
@app.route('/api/users', methods=['GET'])
@token_required
@admin_required
def get_users(current_user):
    users = User.query.all()
    return jsonify([user.to_dict() for user in users]), 200


@app.route('/api/users', methods=['POST'])
@token_required
@admin_required
def create_user(current_user):
    data = request.get_json()

    if not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Логин и пароль обязательны для заполнения!'}), 400

    # Проверяем, не существует ли уже пользователь с таким логином
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Пользователь с таким логином уже существует!'}), 400

    new_user = User(
        username=data['username'],
        role=data.get('role', 'editor'),
        full_name=data.get('fullName', '')
    )
    new_user.set_password(data['password'])

    db.session.add(new_user)
    db.session.commit()

    return jsonify(new_user.to_dict()), 201


@app.route('/api/users/<int:id>', methods=['PUT'])
@token_required
@admin_required
def update_user(current_user, id):
    user = User.query.get_or_404(id)
    data = request.get_json()

    if 'username' in data and data['username'] != user.username:
        # Проверяем, не существует ли уже пользователь с таким логином
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'message': 'Пользователь с таким логином уже существует!'}), 400
        user.username = data['username']

    if 'password' in data and data['password']:
        user.set_password(data['password'])

    if 'role' in data:
        user.role = data['role']

    if 'fullName' in data:
        user.full_name = data['fullName']

    db.session.commit()

    return jsonify(user.to_dict()), 200


@app.route('/api/users/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(current_user, id):
    # Нельзя удалить самого себя
    if id == current_user.id:
        return jsonify({'message': 'Вы не можете удалить собственную учетную запись!'}), 400

    user = User.query.get_or_404(id)

    # Нельзя удалить последнего администратора
    if user.role == 'admin' and User.query.filter_by(role='admin').count() <= 1:
        return jsonify({'message': 'Нельзя удалить последнего администратора!'}), 400

    db.session.delete(user)
    db.session.commit()

    return jsonify({'message': 'Пользователь успешно удален!'}), 200





# Создаем функцию для инициализации базы данных
def init_db():
    with app.app_context():
        db.create_all()

        # Check if time slots already exist
        if TimeSlot.query.count() == 0:
            # Default time slots
            default_slots = [
                {'slot_number': 1, 'time_start': '08:00', 'time_end': '09:20'},
                {'slot_number': 2, 'time_start': '09:30', 'time_end': '10:50'},
                {'slot_number': 3, 'time_start': '11:00', 'time_end': '12:20'},
                {'slot_number': 4, 'time_start': '12:40', 'time_end': '14:00'},
                {'slot_number': 5, 'time_start': '14:10', 'time_end': '15:30'},
                {'slot_number': 6, 'time_start': '15:40', 'time_end': '17:00'},
                {'slot_number': 7, 'time_start': '17:10', 'time_end': '18:30'},
                {'slot_number': 8, 'time_start': '18:40', 'time_end': '20:00'}
            ]

            for slot_data in default_slots:
                slot = TimeSlot(**slot_data)
                db.session.add(slot)

            db.session.commit()


if __name__ == '__main__':
    # Инициализируем базу данных перед запуском
    init_db()
    app.run(debug=True)