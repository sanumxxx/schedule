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


class LessonType(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type_name = db.Column(db.String(50), nullable=False, unique=True)
    db_values = db.Column(db.Text, nullable=False)  # Stored as JSON string
    full_name = db.Column(db.String(100), nullable=True)
    hours_multiplier = db.Column(db.Integer, default=2)
    color = db.Column(db.String(20), default="#E9F0FC")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'type_name': self.type_name,
            'db_values': json.loads(self.db_values),  # Convert JSON string to list
            'full_name': self.full_name,
            'hours_multiplier': self.hours_multiplier,
            'color': self.color,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        }

    # Helper method to check if a DB value matches this lesson type
    def matches_db_value(self, value):
        if not value:
            return False

        db_values_list = json.loads(self.db_values)
        return value.lower() in [v.lower() for v in db_values_list if v]

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
# Экспорт расписания в Excel
@app.route('/api/schedule/<string:type>/<string:id>/export', methods=['GET'])
def export_schedule(type, id):
    try:
        # Получаем параметры запроса
        semester = request.args.get('semester', 1, type=int)
        week = request.args.get('week', 1, type=int)

        # Проверка корректности типа
        if type not in ['group', 'teacher', 'auditory']:
            return jsonify({'message': 'Неизвестный тип расписания!'}), 400

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

        # Проверяем, есть ли данные для экспорта
        if not schedule_items:
            return jsonify({'message': f'Нет данных для экспорта по заданным параметрам'}), 404

        # Определяем год для семестра
        current_date = datetime.now()
        year = current_date.year

        # Логика определения года в зависимости от семестра
        if semester == 2 and current_date.month < 8:
            # Второй семестр текущего учебного года (весна)
            pass
        elif semester == 1 and current_date.month >= 8:
            # Первый семестр текущего учебного года (осень)
            pass
        else:
            # Корректируем год
            year = year - 1 if semester == 1 else year

        # Получаем даты для недели
        dates = get_dates_for_week(year, week)

        # Получаем актуальные временные слоты
        time_slots = TimeSlot.query.filter_by(is_active=True).order_by(TimeSlot.slot_number).all()

        # Функция для форматирования текста ячейки
        def format_lesson_cell(item, type):
            cell_text = f"{item.subject}\n"

            if type != 'group':
                cell_text += f"Группа: {item.group_name}\n"

            if type != 'teacher' and item.teacher_name:
                cell_text += f"Преп.: {item.teacher_name}\n"

            if type != 'auditory' and item.auditory:
                cell_text += f"Ауд.: {item.auditory}\n"

            if item.lesson_type:
                cell_text += f"Тип: {item.lesson_type}"

            if item.subgroup > 0:
                cell_text += f" (п/г {item.subgroup})"

            return cell_text

        # Функция для оценки количества строк текста в ячейке
        def estimate_row_height(text, chars_per_line=25):
            # Подсчитываем количество строк по явным переносам
            explicit_lines = text.count('\n') + 1

            # Оцениваем, сколько строк будет из-за переноса текста по ширине
            total_chars = len(text.replace('\n', ''))
            wrapped_lines = total_chars / chars_per_line

            # Берем максимум из двух оценок и добавляем запас для межстрочных интервалов
            estimated_lines = max(explicit_lines, wrapped_lines) * 1.2

            # Базовая высота одной строки в пикселях
            line_height = 15

            # Рассчитываем высоту в пикселях (минимум 60)
            return max(60, int(estimated_lines * line_height))

        # Создаем Excel файл
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet()

        # Настройка форматов для Excel
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
            'border': 1,
            'text_wrap': True  # Перенос текста для лучшей читаемости
        })

        # Форматы для разных типов занятий
        lecture_format = workbook.add_format({
            'align': 'center',
            'valign': 'vcenter',
            'border': 1,
            'text_wrap': True,
            'bg_color': '#E9F0FC'  # Голубой для лекций
        })

        practice_format = workbook.add_format({
            'align': 'center',
            'valign': 'vcenter',
            'border': 1,
            'text_wrap': True,
            'bg_color': '#E3F9E5'  # Зеленый для практик
        })

        lab_format = workbook.add_format({
            'align': 'center',
            'valign': 'vcenter',
            'border': 1,
            'text_wrap': True,
            'bg_color': '#FFF8E8'  # Желтый для лабораторных
        })

        seminar_format = workbook.add_format({
            'align': 'center',
            'valign': 'vcenter',
            'border': 1,
            'text_wrap': True,
            'bg_color': '#F2E8F7'  # Фиолетовый для семинаров
        })

        # Функция для определения формата ячейки в зависимости от типа занятия
        def get_lesson_format(lesson_type):
            if not lesson_type:
                return cell_format

            lesson_type_lower = lesson_type.lower()

            if 'лек' in lesson_type_lower:
                return lecture_format
            elif 'пр' in lesson_type_lower:
                return practice_format
            elif 'лаб' in lesson_type_lower:
                return lab_format
            elif 'сем' in lesson_type_lower:
                return seminar_format

            return cell_format

        # Заголовки столбцов
        weekdays = ['Время', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

        # Заголовок листа
        worksheet.merge_range('A1:G1', f"{name} - {semester} семестр, {week} неделя", header_format)

        # Установка ширины колонок
        worksheet.set_column(0, 0, 15)  # Колонка времени
        worksheet.set_column(1, 6, 30)  # Колонки дней недели - увеличиваем до 30 для лучшей читаемости

        # Заголовки дней недели (со 2й строки)
        for col, day in enumerate(weekdays):
            worksheet.write(1, col, day, header_format)

        # Даты под днями недели
        row_index = 2  # Третья строка для дат
        for i in range(1, 7):
            if i in dates:
                date_obj = datetime.strptime(dates[i], '%Y-%m-%d')
                formatted_date = date_obj.strftime('%d.%m.%Y')
                worksheet.write(row_index, i, formatted_date, cell_format)

        row_index += 1  # Переходим к строке времени занятий

        # Если нет временных слотов, создаем стандартный набор
        if not time_slots:
            default_times = [
                {'time_start': '08:00', 'time_end': '09:20'},
                {'time_start': '09:30', 'time_end': '10:50'},
                {'time_start': '11:00', 'time_end': '12:20'},
                {'time_start': '12:40', 'time_end': '14:00'},
                {'time_start': '14:10', 'time_end': '15:30'},
                {'time_start': '15:40', 'time_end': '17:00'},
                {'time_start': '17:10', 'time_end': '18:30'},
                {'time_start': '18:40', 'time_end': '20:00'}
            ]

            times = default_times
        else:
            # Извлекаем информацию о времени из временных слотов
            times = [{'time_start': slot.time_start, 'time_end': slot.time_end} for slot in time_slots]

        # Получаем все уникальные комбинации времени из расписания
        unique_times = set()
        for item in schedule_items:
            unique_times.add(f"{item.time_start}-{item.time_end}")

        # Добавляем времена из расписания, которых нет в стандартных слотах
        standard_time_keys = set(f"{t['time_start']}-{t['time_end']}" for t in times)
        for time_key in unique_times:
            if time_key not in standard_time_keys:
                start, end = time_key.split('-')
                times.append({'time_start': start, 'time_end': end})

        # Сортируем времена по времени начала
        times.sort(key=lambda x: x['time_start'])

        # Заголовки строк (время пар) и подготовка матрицы расписания
        time_map = {}  # Карта для хранения индексов времен
        for idx, time_slot in enumerate(times):
            time_key = f"{time_slot['time_start']}-{time_slot['time_end']}"
            time_map[time_key] = idx

            # Записываем ячейку времени
            time_str = f"{time_slot['time_start']}-{time_slot['time_end']}"
            worksheet.write(row_index + idx, 0, time_str, cell_format)

            # Инициализируем пустые ячейки для всех дней недели
            for day in range(1, 7):
                worksheet.write(row_index + idx, day, "", cell_format)

        # Создаем матрицу для хранения содержимого ячеек
        # (день недели, временной слот) -> [занятия]
        schedule_matrix = {}

        # Заполняем матрицу данными
        for item in schedule_items:
            time_key = f"{item.time_start}-{item.time_end}"

            # Если этого времени нет в карте, добавляем его
            if time_key not in time_map:
                times.append({'time_start': item.time_start, 'time_end': item.time_end})
                times.sort(key=lambda x: x['time_start'])

                # Пересоздаем карту и пустые ячейки
                time_map = {}
                for idx, time_slot in enumerate(times):
                    new_time_key = f"{time_slot['time_start']}-{time_slot['time_end']}"
                    time_map[new_time_key] = idx

                    # Перезаписываем ячейку времени
                    time_str = f"{time_slot['time_start']}-{time_slot['time_end']}"
                    worksheet.write(row_index + idx, 0, time_str, cell_format)

                    # Перезаписываем пустые ячейки
                    for day in range(1, 7):
                        worksheet.write(row_index + idx, day, "", cell_format)

            # Записываем занятие в матрицу
            matrix_key = (item.weekday, time_key)

            if matrix_key not in schedule_matrix:
                schedule_matrix[matrix_key] = []

            schedule_matrix[matrix_key].append(item)

        # Словарь для отслеживания наибольшей высоты для каждого временного слота
        row_heights = {}
        for time_idx in range(len(times)):
            row_heights[time_idx] = 60  # Минимальная высота 60 пикселей

        # Заполняем таблицу из матрицы
        for (day, time_key), items in schedule_matrix.items():
            if not (1 <= day <= 6):  # Проверка валидности дня недели
                continue

            # Получаем индекс строки для этого времени
            time_idx = time_map[time_key]

            # Если несколько занятий в одной ячейке, объединяем их
            if len(items) > 1:
                combined_text = ""
                for item in items:
                    # Добавляем разделитель между занятиями
                    if combined_text:
                        combined_text += "\n---\n"

                    combined_text += format_lesson_cell(item, type)

                # Оцениваем необходимую высоту на основе текста
                cell_height = estimate_row_height(combined_text,
                                                  chars_per_line=30)  # 30 символов на строку для ширины колонки 30

                # Обновляем максимальную высоту для данного временного слота
                row_heights[time_idx] = max(row_heights[time_idx], cell_height)

                worksheet.write(row_index + time_idx, day, combined_text, cell_format)
            else:
                item = items[0]
                lesson_text = format_lesson_cell(item, type)
                lesson_format = get_lesson_format(item.lesson_type)

                # Оцениваем необходимую высоту на основе текста
                cell_height = estimate_row_height(lesson_text, chars_per_line=30)  # 30 символов на строку

                # Обновляем максимальную высоту для данного временного слота
                row_heights[time_idx] = max(row_heights[time_idx], cell_height)

                worksheet.write(row_index + time_idx, day, lesson_text, lesson_format)

        # Устанавливаем адаптивную высоту строк
        for idx, height in row_heights.items():
            worksheet.set_row(row_index + idx, height)

        workbook.close()

        # Подготавливаем файл для отправки
        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f"{type}_{id}_schedule_{semester}_{week}.xlsx"
        )

    except Exception as e:
        # Логируем ошибку
        app.logger.error(f"Ошибка при экспорте расписания: {str(e)}")
        return jsonify({'message': f'Произошла ошибка при экспорте расписания: {str(e)}'}), 500


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


# Add this endpoint to your server.py file

@app.route('/api/schedule/check_availability', methods=['POST'])
@token_required
def check_availability(current_user):
    """Check availability of time slots for a specific week with detailed conflict information"""
    data = request.get_json()

    # Required parameters
    semester = data.get('semester')
    week_number = data.get('week_number')
    lesson_id = data.get('lesson_id')  # ID of the lesson being moved
    auditory = data.get('auditory')  # Auditory to check for
    teacher_name = data.get('teacher_name')  # Teacher to check for
    group_name = data.get('group_name')  # Group to check for

    if not all([semester, week_number]):
        return jsonify({'message': 'Missing required parameters'}), 400

    # Get all occupied time slots for this week with conflict details
    occupied_slots = []

    try:
        # Base query to find lessons that could conflict
        base_query = Schedule.query.filter(
            Schedule.id != lesson_id,  # Exclude the current lesson
            Schedule.semester == semester,
            Schedule.week_number == week_number
        )

        # Find conflicts based on provided parameters
        if auditory:
            auditory_conflicts = base_query.filter(Schedule.auditory == auditory).all()
            for lesson in auditory_conflicts:
                occupied_slots.append({
                    'weekday': lesson.weekday,
                    'date': lesson.date.strftime('%Y-%m-%d') if lesson.date else None,
                    'time_start': lesson.time_start,
                    'time_end': lesson.time_end,
                    'subject': lesson.subject,
                    'group_name': lesson.group_name,
                    'teacher_name': lesson.teacher_name,
                    'conflict_type': 'auditory',
                    'conflict_value': auditory
                })

        if teacher_name:
            teacher_conflicts = base_query.filter(Schedule.teacher_name == teacher_name).all()
            for lesson in teacher_conflicts:
                # Add if not already added or if it's at the same time (to show multiple conflict types)
                existing_conflict = next((slot for slot in occupied_slots
                                          if slot['weekday'] == lesson.weekday and
                                          slot['time_start'] == lesson.time_start), None)

                if existing_conflict:
                    # Add teacher conflict type to existing conflict
                    if 'conflict_types' not in existing_conflict:
                        existing_conflict['conflict_types'] = [existing_conflict['conflict_type']]
                        existing_conflict['conflict_values'] = [existing_conflict['conflict_value']]

                    existing_conflict['conflict_types'].append('teacher')
                    existing_conflict['conflict_values'].append(teacher_name)
                else:
                    occupied_slots.append({
                        'weekday': lesson.weekday,
                        'date': lesson.date.strftime('%Y-%m-%d') if lesson.date else None,
                        'time_start': lesson.time_start,
                        'time_end': lesson.time_end,
                        'subject': lesson.subject,
                        'group_name': lesson.group_name,
                        'teacher_name': lesson.teacher_name,
                        'conflict_type': 'teacher',
                        'conflict_value': teacher_name
                    })

        if group_name:
            group_conflicts = base_query.filter(Schedule.group_name == group_name).all()
            for lesson in group_conflicts:
                # Add if not already added or if it's at the same time
                existing_conflict = next((slot for slot in occupied_slots
                                          if slot['weekday'] == lesson.weekday and
                                          slot['time_start'] == lesson.time_start), None)

                if existing_conflict:
                    # Add group conflict type to existing conflict
                    if 'conflict_types' not in existing_conflict:
                        existing_conflict['conflict_types'] = [existing_conflict['conflict_type']]
                        existing_conflict['conflict_values'] = [existing_conflict['conflict_value']]

                    existing_conflict['conflict_types'].append('group')
                    existing_conflict['conflict_values'].append(group_name)
                else:
                    occupied_slots.append({
                        'weekday': lesson.weekday,
                        'date': lesson.date.strftime('%Y-%m-%d') if lesson.date else None,
                        'time_start': lesson.time_start,
                        'time_end': lesson.time_end,
                        'subject': lesson.subject,
                        'group_name': lesson.group_name,
                        'teacher_name': lesson.teacher_name,
                        'conflict_type': 'group',
                        'conflict_value': group_name
                    })

        # Return the list of occupied slots with conflict details
        return jsonify({
            'auditory': auditory,
            'teacher_name': teacher_name,
            'group_name': group_name,
            'occupied_slots': occupied_slots
        }), 200

    except Exception as e:
        print(f"Error checking availability: {str(e)}")
        return jsonify({'message': 'Error checking availability', 'error': str(e)}), 500


@app.route('/api/schedule/group_move', methods=['POST'])
@token_required
def move_group_schedule(current_user):
    """Перенос всех занятий группы с одного времени на другое"""
    data = request.get_json()

    # Обязательные параметры
    group_name = data.get('group_name')
    semester = data.get('semester')
    week_number = data.get('week_number')
    source_weekday = data.get('source_weekday')
    source_time_start = data.get('source_time_start')
    target_weekday = data.get('target_weekday')
    target_time_start = data.get('target_time_start')
    target_time_end = data.get('target_time_end')
    force_move = data.get('force_move', False)

    if not all([group_name, semester, week_number, source_weekday, source_time_start,
                target_weekday, target_time_start, target_time_end]):
        return jsonify({'message': 'Отсутствуют обязательные параметры'}), 400

    try:
        # Найти все занятия этой группы на указанный день и время
        lessons = Schedule.query.filter_by(
            group_name=group_name,
            semester=semester,
            week_number=week_number,
            weekday=source_weekday,
            time_start=source_time_start
        ).all()

        if not lessons:
            return jsonify({'message': 'Занятия не найдены'}), 404

        # Если force_move=False, проверить конфликты
        if not force_move:
            conflicts = []

            for lesson in lessons:
                # Проверка конфликтов для аудитории
                if lesson.auditory:
                    auditory_conflicts = Schedule.query.filter(
                        Schedule.id != lesson.id,
                        Schedule.semester == semester,
                        Schedule.week_number == week_number,
                        Schedule.weekday == target_weekday,
                        Schedule.auditory == lesson.auditory,
                        # Проверка пересечения времени
                        ((Schedule.time_start <= target_time_start) & (Schedule.time_end > target_time_start)) |
                        ((Schedule.time_start < target_time_end) & (Schedule.time_end >= target_time_end)) |
                        ((Schedule.time_start >= target_time_start) & (Schedule.time_end <= target_time_end))
                    ).all()

                    for conflict in auditory_conflicts:
                        conflicts.append({
                            'lesson_id': lesson.id,
                            'conflict_id': conflict.id,
                            'conflict_type': 'auditory',
                            'conflict_value': lesson.auditory,
                            'subject': conflict.subject,
                            'teacher_name': conflict.teacher_name,
                            'group_name': conflict.group_name
                        })

                # Проверка конфликтов для преподавателя
                if lesson.teacher_name:
                    teacher_conflicts = Schedule.query.filter(
                        Schedule.id != lesson.id,
                        Schedule.semester == semester,
                        Schedule.week_number == week_number,
                        Schedule.weekday == target_weekday,
                        Schedule.teacher_name == lesson.teacher_name,
                        # Проверка пересечения времени
                        ((Schedule.time_start <= target_time_start) & (Schedule.time_end > target_time_start)) |
                        ((Schedule.time_start < target_time_end) & (Schedule.time_end >= target_time_end)) |
                        ((Schedule.time_start >= target_time_start) & (Schedule.time_end <= target_time_end))
                    ).all()

                    for conflict in teacher_conflicts:
                        conflicts.append({
                            'lesson_id': lesson.id,
                            'conflict_id': conflict.id,
                            'conflict_type': 'teacher',
                            'conflict_value': lesson.teacher_name,
                            'subject': conflict.subject,
                            'teacher_name': conflict.teacher_name,
                            'group_name': conflict.group_name
                        })

                # Проверка конфликтов для группы (на всякий случай, хотя тут перемещаем одну группу)
                group_conflicts = Schedule.query.filter(
                    Schedule.id != lesson.id,
                    Schedule.semester == semester,
                    Schedule.week_number == week_number,
                    Schedule.weekday == target_weekday,
                    Schedule.group_name == group_name,
                    # Проверка пересечения времени
                    ((Schedule.time_start <= target_time_start) & (Schedule.time_end > target_time_start)) |
                    ((Schedule.time_start < target_time_end) & (Schedule.time_end >= target_time_end)) |
                    ((Schedule.time_start >= target_time_start) & (Schedule.time_end <= target_time_end))
                ).all()

                for conflict in group_conflicts:
                    conflicts.append({
                        'lesson_id': lesson.id,
                        'conflict_id': conflict.id,
                        'conflict_type': 'group',
                        'conflict_value': group_name,
                        'subject': conflict.subject,
                        'teacher_name': conflict.teacher_name,
                        'group_name': conflict.group_name
                    })

            # Если есть конфликты, возвращаем их и прерываем операцию
            if conflicts:
                return jsonify({
                    'message': 'Обнаружены конфликты при перемещении занятий',
                    'conflicts': conflicts
                }), 409

        # Вычисляем новую дату на основе дня недели
        first_lesson = lessons[0]
        date_diff = target_weekday - source_weekday

        # Перемещаем занятия
        moved_lessons = []
        for lesson in lessons:
            # Вычисляем новую дату
            if date_diff != 0:
                new_date = lesson.date + timedelta(days=date_diff)
            else:
                new_date = lesson.date

            # Обновляем занятие
            lesson.weekday = target_weekday
            lesson.date = new_date
            lesson.time_start = target_time_start
            lesson.time_end = target_time_end

            moved_lessons.append(lesson.to_dict())

        # Сохраняем изменения
        db.session.commit()

        return jsonify({
            'message': f'Успешно перемещено {len(moved_lessons)} занятий',
            'moved_lessons': moved_lessons
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Ошибка при перемещении занятий: {str(e)}'}), 500


@app.route('/api/schedule/usage_stats', methods=['GET'])
@token_required
def get_usage_stats(current_user):
    """Получение статистики загруженности преподавателей, групп и аудиторий"""
    semester = request.args.get('semester', type=int)
    week_number = request.args.get('week_number', type=int)

    if not all([semester, week_number]):
        return jsonify({'message': 'Не указаны обязательные параметры'}), 400

    try:
        # Статистика по общему количеству занятий
        total_lessons = Schedule.query.filter_by(
            semester=semester,
            week_number=week_number
        ).count()

        # Статистика по преподавателям
        teacher_stats = db.session.query(
            Schedule.teacher_name,
            db.func.count(Schedule.id).label('lessons_count')
        ).filter(
            Schedule.semester == semester,
            Schedule.week_number == week_number,
            Schedule.teacher_name != ''
        ).group_by(Schedule.teacher_name).all()

        # Статистика по группам
        group_stats = db.session.query(
            Schedule.group_name,
            db.func.count(Schedule.id).label('lessons_count')
        ).filter(
            Schedule.semester == semester,
            Schedule.week_number == week_number
        ).group_by(Schedule.group_name).all()

        # Статистика по аудиториям
        auditory_stats = db.session.query(
            Schedule.auditory,
            db.func.count(Schedule.id).label('lessons_count')
        ).filter(
            Schedule.semester == semester,
            Schedule.week_number == week_number,
            Schedule.auditory != ''
        ).group_by(Schedule.auditory).all()

        # Статистика по дням недели
        weekday_stats = db.session.query(
            Schedule.weekday,
            db.func.count(Schedule.id).label('lessons_count')
        ).filter(
            Schedule.semester == semester,
            Schedule.week_number == week_number
        ).group_by(Schedule.weekday).all()

        # Статистика по времени занятий
        timeslot_stats = db.session.query(
            Schedule.time_start,
            db.func.count(Schedule.id).label('lessons_count')
        ).filter(
            Schedule.semester == semester,
            Schedule.week_number == week_number
        ).group_by(Schedule.time_start).all()

        return jsonify({
            'total_lessons': total_lessons,
            'teacher_stats': [{'teacher_name': t[0], 'lessons_count': t[1]} for t in teacher_stats],
            'group_stats': [{'group_name': g[0], 'lessons_count': g[1]} for g in group_stats],
            'auditory_stats': [{'auditory': a[0], 'lessons_count': a[1]} for a in auditory_stats],
            'weekday_stats': [{'weekday': w[0], 'lessons_count': w[1]} for w in weekday_stats],
            'timeslot_stats': [{'time_start': t[0], 'lessons_count': t[1]} for t in timeslot_stats]
        }), 200

    except Exception as e:
        return jsonify({'message': f'Ошибка при получении статистики: {str(e)}'}), 500


@app.route('/api/schedule/find_optimal_time', methods=['POST'])
@token_required
def find_optimal_time(current_user):
    """Поиск оптимального времени для занятия без конфликтов"""
    data = request.get_json()

    # Обязательные параметры
    lesson_id = data.get('lesson_id')
    semester = data.get('semester')
    week_number = data.get('week_number')

    if not all([lesson_id, semester, week_number]):
        return jsonify({'message': 'Не указаны обязательные параметры'}), 400

    try:
        # Получаем информацию о занятии
        lesson = Schedule.query.get_or_404(lesson_id)

        # Получаем все временные слоты
        time_slots = TimeSlot.query.filter_by(is_active=True).order_by(TimeSlot.slot_number).all()

        # Генерируем возможные варианты (все дни недели и все временные слоты)
        options = []

        for weekday in range(1, 7):  # Пн-Сб (1-6)
            for slot in time_slots:
                # Определяем дату для этого дня недели
                dates = get_dates_for_week(datetime.now().year, week_number)
                date_str = dates.get(weekday)

                if not date_str:
                    continue

                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()

                # Проверяем, свободно ли это время
                conflicts = {
                    'teacher_conflicts': [],
                    'group_conflicts': [],
                    'auditory_conflicts': []
                }

                # Проверка конфликтов для преподавателя
                if lesson.teacher_name:
                    teacher_conflicts = Schedule.query.filter(
                        Schedule.id != lesson_id,
                        Schedule.semester == semester,
                        Schedule.week_number == week_number,
                        Schedule.weekday == weekday,
                        Schedule.teacher_name == lesson.teacher_name,
                        # Проверка пересечения времени
                        ((Schedule.time_start <= slot.time_start) & (Schedule.time_end > slot.time_start)) |
                        ((Schedule.time_start < slot.time_end) & (Schedule.time_end >= slot.time_end)) |
                        ((Schedule.time_start >= slot.time_start) & (Schedule.time_end <= slot.time_end))
                    ).all()

                    if teacher_conflicts:
                        conflicts['teacher_conflicts'] = [c.to_dict() for c in teacher_conflicts]

                # Проверка конфликтов для группы
                if lesson.group_name:
                    group_conflicts = Schedule.query.filter(
                        Schedule.id != lesson_id,
                        Schedule.semester == semester,
                        Schedule.week_number == week_number,
                        Schedule.weekday == weekday,
                        Schedule.group_name == lesson.group_name,
                        # Проверка пересечения времени
                        ((Schedule.time_start <= slot.time_start) & (Schedule.time_end > slot.time_start)) |
                        ((Schedule.time_start < slot.time_end) & (Schedule.time_end >= slot.time_end)) |
                        ((Schedule.time_start >= slot.time_start) & (Schedule.time_end <= slot.time_end))
                    ).all()

                    if group_conflicts:
                        conflicts['group_conflicts'] = [c.to_dict() for c in group_conflicts]

                # Проверка конфликтов для аудитории
                if lesson.auditory:
                    auditory_conflicts = Schedule.query.filter(
                        Schedule.id != lesson_id,
                        Schedule.semester == semester,
                        Schedule.week_number == week_number,
                        Schedule.weekday == weekday,
                        Schedule.auditory == lesson.auditory,
                        # Проверка пересечения времени
                        ((Schedule.time_start <= slot.time_start) & (Schedule.time_end > slot.time_start)) |
                        ((Schedule.time_start < slot.time_end) & (Schedule.time_end >= slot.time_end)) |
                        ((Schedule.time_start >= slot.time_start) & (Schedule.time_end <= slot.time_end))
                    ).all()

                    if auditory_conflicts:
                        conflicts['auditory_conflicts'] = [c.to_dict() for c in auditory_conflicts]

                # Определяем общее количество конфликтов
                total_conflicts = (
                        len(conflicts['teacher_conflicts']) +
                        len(conflicts['group_conflicts']) +
                        len(conflicts['auditory_conflicts'])
                )

                # Добавляем вариант в список
                options.append({
                    'weekday': weekday,
                    'weekday_name': ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][weekday],
                    'date': date_str,
                    'time_start': slot.time_start,
                    'time_end': slot.time_end,
                    'time_slot_id': slot.id,
                    'conflicts': conflicts,
                    'total_conflicts': total_conflicts
                })

        # Сортируем варианты по количеству конфликтов (сначала без конфликтов)
        options.sort(key=lambda x: x['total_conflicts'])

        # Отбираем 10 лучших вариантов
        top_options = options[:10]

        return jsonify({
            'lesson': lesson.to_dict(),
            'options': top_options,
            'current': {
                'weekday': lesson.weekday,
                'date': lesson.date.strftime('%Y-%m-%d') if lesson.date else None,
                'time_start': lesson.time_start,
                'time_end': lesson.time_end
            }
        }), 200

    except Exception as e:
        return jsonify({'message': f'Ошибка при поиске оптимального времени: {str(e)}'}), 500


@app.route('/api/schedule/by-date/<date>', methods=['GET'])
def get_schedule_by_date(date):
    try:
        date_obj = datetime.strptime(date, '%Y-%m-%d').date()
        # Ищем занятия с этой датой
        schedule_items = Schedule.query.filter_by(date=date_obj).all()

        return jsonify([item.to_dict() for item in schedule_items]), 200
    except Exception as e:
        return jsonify({'message': f'Ошибка: {str(e)}'}), 500

@app.route('/api/schedule/all_conflicts', methods=['GET'])
@token_required
def get_all_conflicts(current_user):
    """Получение информации о всех конфликтах в расписании"""
    semester = request.args.get('semester', type=int)
    week_number = request.args.get('week_number', type=int)

    if not all([semester, week_number]):
        return jsonify({'message': 'Не указаны обязательные параметры'}), 400

    try:
        # Получаем все занятия на указанную неделю
        lessons = Schedule.query.filter_by(
            semester=semester,
            week_number=week_number
        ).all()

        # Создаем словари для быстрого поиска
        teacher_schedule = {}  # teacher_name -> [[weekday, time_start, time_end, lesson_id], ...]
        group_schedule = {}  # group_name -> [[weekday, time_start, time_end, lesson_id], ...]
        auditory_schedule = {}  # auditory -> [[weekday, time_start, time_end, lesson_id], ...]

        for lesson in lessons:
            # Добавляем в расписание преподавателя
            if lesson.teacher_name:
                if lesson.teacher_name not in teacher_schedule:
                    teacher_schedule[lesson.teacher_name] = []
                teacher_schedule[lesson.teacher_name].append([
                    lesson.weekday, lesson.time_start, lesson.time_end, lesson.id, lesson
                ])

            # Добавляем в расписание группы
            if lesson.group_name not in group_schedule:
                group_schedule[lesson.group_name] = []
            group_schedule[lesson.group_name].append([
                lesson.weekday, lesson.time_start, lesson.time_end, lesson.id, lesson
            ])

            # Добавляем в расписание аудитории
            if lesson.auditory:
                if lesson.auditory not in auditory_schedule:
                    auditory_schedule[lesson.auditory] = []
                auditory_schedule[lesson.auditory].append([
                    lesson.weekday, lesson.time_start, lesson.time_end, lesson.id, lesson
                ])

        # Функция для проверки пересечения временных интервалов
        def has_time_overlap(time1_start, time1_end, time2_start, time2_end):
            return (time1_start < time2_end and time1_end > time2_start)

        # Поиск конфликтов
        conflicts = []

        # Конфликты преподавателей
        for teacher, schedule in teacher_schedule.items():
            for i in range(len(schedule)):
                for j in range(i + 1, len(schedule)):
                    if (schedule[i][0] == schedule[j][0] and  # Тот же день недели
                            has_time_overlap(schedule[i][1], schedule[i][2], schedule[j][1], schedule[j][2])):
                        conflicts.append({
                            'conflict_type': 'teacher',
                            'conflict_value': teacher,
                            'weekday': schedule[i][0],
                            'time1_start': schedule[i][1],
                            'time1_end': schedule[i][2],
                            'time2_start': schedule[j][1],
                            'time2_end': schedule[j][2],
                            'lesson1_id': schedule[i][3],
                            'lesson2_id': schedule[j][3],
                            'lesson1': schedule[i][4].to_dict(),
                            'lesson2': schedule[j][4].to_dict()
                        })

        # Конфликты групп
        for group, schedule in group_schedule.items():
            for i in range(len(schedule)):
                for j in range(i + 1, len(schedule)):
                    if (schedule[i][0] == schedule[j][0] and  # Тот же день недели
                            has_time_overlap(schedule[i][1], schedule[i][2], schedule[j][1], schedule[j][2])):
                        conflicts.append({
                            'conflict_type': 'group',
                            'conflict_value': group,
                            'weekday': schedule[i][0],
                            'time1_start': schedule[i][1],
                            'time1_end': schedule[i][2],
                            'time2_start': schedule[j][1],
                            'time2_end': schedule[j][2],
                            'lesson1_id': schedule[i][3],
                            'lesson2_id': schedule[j][3],
                            'lesson1': schedule[i][4].to_dict(),
                            'lesson2': schedule[j][4].to_dict()
                        })

        # Конфликты аудиторий
        for auditory, schedule in auditory_schedule.items():
            for i in range(len(schedule)):
                for j in range(i + 1, len(schedule)):
                    if (schedule[i][0] == schedule[j][0] and  # Тот же день недели
                            has_time_overlap(schedule[i][1], schedule[i][2], schedule[j][1], schedule[j][2])):
                        conflicts.append({
                            'conflict_type': 'auditory',
                            'conflict_value': auditory,
                            'weekday': schedule[i][0],
                            'time1_start': schedule[i][1],
                            'time1_end': schedule[i][2],
                            'time2_start': schedule[j][1],
                            'time2_end': schedule[j][2],
                            'lesson1_id': schedule[i][3],
                            'lesson2_id': schedule[j][3],
                            'lesson1': schedule[i][4].to_dict(),
                            'lesson2': schedule[j][4].to_dict()
                        })

        # Группируем конфликты по типу
        grouped_conflicts = {
            'teacher_conflicts': [c for c in conflicts if c['conflict_type'] == 'teacher'],
            'group_conflicts': [c for c in conflicts if c['conflict_type'] == 'group'],
            'auditory_conflicts': [c for c in conflicts if c['conflict_type'] == 'auditory']
        }

        return jsonify({
            'total_conflicts': len(conflicts),
            'conflicts': grouped_conflicts,
            'conflicts_by_type': {
                'teacher': len(grouped_conflicts['teacher_conflicts']),
                'group': len(grouped_conflicts['group_conflicts']),
                'auditory': len(grouped_conflicts['auditory_conflicts'])
            }
        }), 200

    except Exception as e:
        return jsonify({'message': f'Ошибка при анализе конфликтов: {str(e)}'}), 500





# Improved PUT endpoint with better conflict checking
@app.route('/api/schedule/<int:id>', methods=['PUT'])
@token_required
def update_schedule(current_user, id):
    # Find the existing schedule item
    item = Schedule.query.get_or_404(id)
    data = request.get_json()

    # Get the force flag from the request (default to False)
    force_update = data.get('force_update', False)

    # Create a copy of the existing data to check for changes
    new_date = data.get('date', item.date)
    new_weekday = data.get('weekday', item.weekday)
    new_time_start = data.get('time_start', item.time_start)
    new_time_end = data.get('time_end', item.time_end)
    new_auditory = data.get('auditory', item.auditory)
    new_teacher_name = data.get('teacher_name', item.teacher_name)
    new_group_name = data.get('group_name', item.group_name)

    # Convert string date to Date object if needed
    if isinstance(new_date, str):
        try:
            new_date = datetime.strptime(new_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Неверный формат даты. Используйте YYYY-MM-DD.'}), 400

    # Check for conflicts only if not forced and there are schedule-related changes
    if not force_update and any([
        'date' in data, 'weekday' in data, 'time_start' in data,
        'time_end' in data, 'auditory' in data, 'teacher_name' in data,
        'group_name' in data
    ]):
        conflict_found = False
        conflicts = []

        # Check for auditory conflicts if auditory is specified
        if new_auditory:
            auditory_conflicts = Schedule.query.filter(
                Schedule.id != id,  # Exclude the current lesson
                Schedule.date == new_date,
                Schedule.auditory == new_auditory,
                # Check for time overlap
                ((Schedule.time_start <= new_time_start) & (Schedule.time_end > new_time_start)) |
                ((Schedule.time_start < new_time_end) & (Schedule.time_end >= new_time_end)) |
                ((Schedule.time_start >= new_time_start) & (Schedule.time_end <= new_time_end))
            ).all()

            if auditory_conflicts:
                conflict_found = True
                for c in auditory_conflicts:
                    conflicts.append({
                        'id': c.id,
                        'subject': c.subject,
                        'group_name': c.group_name,
                        'teacher_name': c.teacher_name,
                        'time_start': c.time_start,
                        'time_end': c.time_end,
                        'conflict_type': 'auditory',
                        'conflict_value': new_auditory
                    })

        # Check for teacher conflicts if teacher is specified
        if new_teacher_name:
            teacher_conflicts = Schedule.query.filter(
                Schedule.id != id,  # Exclude the current lesson
                Schedule.date == new_date,
                Schedule.teacher_name == new_teacher_name,
                # Check for time overlap
                ((Schedule.time_start <= new_time_start) & (Schedule.time_end > new_time_start)) |
                ((Schedule.time_start < new_time_end) & (Schedule.time_end >= new_time_end)) |
                ((Schedule.time_start >= new_time_start) & (Schedule.time_end <= new_time_end))
            ).all()

            if teacher_conflicts:
                conflict_found = True
                for c in teacher_conflicts:
                    conflicts.append({
                        'id': c.id,
                        'subject': c.subject,
                        'group_name': c.group_name,
                        'teacher_name': c.teacher_name,
                        'time_start': c.time_start,
                        'time_end': c.time_end,
                        'conflict_type': 'teacher',
                        'conflict_value': new_teacher_name
                    })

        # Check for group conflicts if group is specified
        if new_group_name:
            group_conflicts = Schedule.query.filter(
                Schedule.id != id,  # Exclude the current lesson
                Schedule.date == new_date,
                Schedule.group_name == new_group_name,
                # Check for time overlap
                ((Schedule.time_start <= new_time_start) & (Schedule.time_end > new_time_start)) |
                ((Schedule.time_start < new_time_end) & (Schedule.time_end >= new_time_end)) |
                ((Schedule.time_start >= new_time_start) & (Schedule.time_end <= new_time_end))
            ).all()

            if group_conflicts:
                conflict_found = True
                for c in group_conflicts:
                    conflicts.append({
                        'id': c.id,
                        'subject': c.subject,
                        'group_name': c.group_name,
                        'teacher_name': c.teacher_name,
                        'time_start': c.time_start,
                        'time_end': c.time_end,
                        'conflict_type': 'group',
                        'conflict_value': new_group_name
                    })

        if conflict_found:
            return jsonify({
                'message': 'Конфликт расписания: обнаружены накладки',
                'conflicts': conflicts
            }), 409  # 409 Conflict status code

    # If no conflicts or force_update is True, update the fields
    if 'semester' in data:
        item.semester = data['semester']
    if 'week_number' in data:
        item.week_number = data['week_number']
    if 'group_name' in data:
        item.group_name = data['group_name']
    if 'course' in data:
        item.course = data['course']
    if 'faculty' in data:
        item.faculty = data['faculty']
    if 'subject' in data:
        item.subject = data['subject']
    if 'lesson_type' in data:
        item.lesson_type = data['lesson_type']
    if 'subgroup' in data:
        item.subgroup = data['subgroup']
    if 'date' in data:
        item.date = new_date
    if 'time_start' in data:
        item.time_start = new_time_start
    if 'time_end' in data:
        item.time_end = new_time_end
    if 'weekday' in data:
        item.weekday = new_weekday
    if 'teacher_name' in data:
        item.teacher_name = new_teacher_name
    if 'auditory' in data:
        item.auditory = new_auditory

    # Update the item in the database
    db.session.commit()

    return jsonify(item.to_dict()), 200


# Complete server-side implementation for the swap functionality
@app.route('/api/schedule/swap', methods=['POST'])
@token_required
def swap_schedule_items(current_user):
    """Swap two lessons in the schedule"""
    data = request.get_json()

    # Get the IDs of the two lessons to swap
    lesson1_id = data.get('lesson1_id')
    lesson2_id = data.get('lesson2_id')
    force_swap = data.get('force_swap', False)

    if not lesson1_id or not lesson2_id:
        return jsonify({'message': 'Missing required lesson IDs'}), 400

    try:
        # Get both lessons
        lesson1 = Schedule.query.get_or_404(lesson1_id)
        lesson2 = Schedule.query.get_or_404(lesson2_id)

        # Save original values for conflict checking
        lesson1_date = lesson1.date
        lesson1_weekday = lesson1.weekday
        lesson1_time_start = lesson1.time_start
        lesson1_time_end = lesson1.time_end
        lesson1_auditory = lesson1.auditory
        lesson1_teacher_name = lesson1.teacher_name
        lesson1_group_name = lesson1.group_name

        lesson2_date = lesson2.date
        lesson2_weekday = lesson2.weekday
        lesson2_time_start = lesson2.time_start
        lesson2_time_end = lesson2.time_end
        lesson2_auditory = lesson2.auditory
        lesson2_teacher_name = lesson2.teacher_name
        lesson2_group_name = lesson2.group_name

        # Check for conflicts if not forcing
        if not force_swap:
            conflicts = []

            # Check conflicts for lesson1 going to lesson2's slot
            conflicts_for_lesson1 = []

            # Check for auditory conflicts
            if lesson1.auditory:
                auditory_conflicts = Schedule.query.filter(
                    Schedule.id != lesson1_id,
                    Schedule.id != lesson2_id,
                    Schedule.date == lesson2.date,
                    Schedule.auditory == lesson1.auditory,
                    # Check for time overlap
                    ((Schedule.time_start <= lesson2.time_start) & (Schedule.time_end > lesson2.time_start)) |
                    ((Schedule.time_start < lesson2.time_end) & (Schedule.time_end >= lesson2.time_end)) |
                    ((Schedule.time_start >= lesson2.time_start) & (Schedule.time_end <= lesson2.time_end))
                ).all()

                for c in auditory_conflicts:
                    conflicts_for_lesson1.append({
                        'id': c.id,
                        'subject': c.subject,
                        'group_name': c.group_name,
                        'teacher_name': c.teacher_name,
                        'auditory': c.auditory,
                        'time_start': c.time_start,
                        'time_end': c.time_end,
                        'conflict_type': 'auditory',
                        'conflict_value': lesson1.auditory
                    })

            # Check for teacher conflicts
            if lesson1.teacher_name:
                teacher_conflicts = Schedule.query.filter(
                    Schedule.id != lesson1_id,
                    Schedule.id != lesson2_id,
                    Schedule.date == lesson2.date,
                    Schedule.teacher_name == lesson1.teacher_name,
                    # Check for time overlap
                    ((Schedule.time_start <= lesson2.time_start) & (Schedule.time_end > lesson2.time_start)) |
                    ((Schedule.time_start < lesson2.time_end) & (Schedule.time_end >= lesson2.time_end)) |
                    ((Schedule.time_start >= lesson2.time_start) & (Schedule.time_end <= lesson2.time_end))
                ).all()

                for c in teacher_conflicts:
                    conflicts_for_lesson1.append({
                        'id': c.id,
                        'subject': c.subject,
                        'group_name': c.group_name,
                        'teacher_name': c.teacher_name,
                        'auditory': c.auditory,
                        'time_start': c.time_start,
                        'time_end': c.time_end,
                        'conflict_type': 'teacher',
                        'conflict_value': lesson1.teacher_name
                    })

            # Check for group conflicts
            if lesson1.group_name:
                group_conflicts = Schedule.query.filter(
                    Schedule.id != lesson1_id,
                    Schedule.id != lesson2_id,
                    Schedule.date == lesson2.date,
                    Schedule.group_name == lesson1.group_name,
                    # Check for time overlap
                    ((Schedule.time_start <= lesson2.time_start) & (Schedule.time_end > lesson2.time_start)) |
                    ((Schedule.time_start < lesson2.time_end) & (Schedule.time_end >= lesson2.time_end)) |
                    ((Schedule.time_start >= lesson2.time_start) & (Schedule.time_end <= lesson2.time_end))
                ).all()

                for c in group_conflicts:
                    conflicts_for_lesson1.append({
                        'id': c.id,
                        'subject': c.subject,
                        'group_name': c.group_name,
                        'teacher_name': c.teacher_name,
                        'auditory': c.auditory,
                        'time_start': c.time_start,
                        'time_end': c.time_end,
                        'conflict_type': 'group',
                        'conflict_value': lesson1.group_name
                    })

            if conflicts_for_lesson1:
                conflicts.append({
                    'lesson_id': lesson1_id,
                    'subject': lesson1.subject,
                    'conflicts': conflicts_for_lesson1
                })

            # Check conflicts for lesson2 going to lesson1's slot
            conflicts_for_lesson2 = []

            # Check for auditory conflicts
            if lesson2.auditory:
                auditory_conflicts = Schedule.query.filter(
                    Schedule.id != lesson1_id,
                    Schedule.id != lesson2_id,
                    Schedule.date == lesson1.date,
                    Schedule.auditory == lesson2.auditory,
                    # Check for time overlap
                    ((Schedule.time_start <= lesson1.time_start) & (Schedule.time_end > lesson1.time_start)) |
                    ((Schedule.time_start < lesson1.time_end) & (Schedule.time_end >= lesson1.time_end)) |
                    ((Schedule.time_start >= lesson1.time_start) & (Schedule.time_end <= lesson1.time_end))
                ).all()

                for c in auditory_conflicts:
                    conflicts_for_lesson2.append({
                        'id': c.id,
                        'subject': c.subject,
                        'group_name': c.group_name,
                        'teacher_name': c.teacher_name,
                        'auditory': c.auditory,
                        'time_start': c.time_start,
                        'time_end': c.time_end,
                        'conflict_type': 'auditory',
                        'conflict_value': lesson2.auditory
                    })

            # Check for teacher conflicts
            if lesson2.teacher_name:
                teacher_conflicts = Schedule.query.filter(
                    Schedule.id != lesson1_id,
                    Schedule.id != lesson2_id,
                    Schedule.date == lesson1.date,
                    Schedule.teacher_name == lesson2.teacher_name,
                    # Check for time overlap
                    ((Schedule.time_start <= lesson1.time_start) & (Schedule.time_end > lesson1.time_start)) |
                    ((Schedule.time_start < lesson1.time_end) & (Schedule.time_end >= lesson1.time_end)) |
                    ((Schedule.time_start >= lesson1.time_start) & (Schedule.time_end <= lesson1.time_end))
                ).all()

                for c in teacher_conflicts:
                    conflicts_for_lesson2.append({
                        'id': c.id,
                        'subject': c.subject,
                        'group_name': c.group_name,
                        'teacher_name': c.teacher_name,
                        'auditory': c.auditory,
                        'time_start': c.time_start,
                        'time_end': c.time_end,
                        'conflict_type': 'teacher',
                        'conflict_value': lesson2.teacher_name
                    })

            # Check for group conflicts
            if lesson2.group_name:
                group_conflicts = Schedule.query.filter(
                    Schedule.id != lesson1_id,
                    Schedule.id != lesson2_id,
                    Schedule.date == lesson1.date,
                    Schedule.group_name == lesson2.group_name,
                    # Check for time overlap
                    ((Schedule.time_start <= lesson1.time_start) & (Schedule.time_end > lesson1.time_start)) |
                    ((Schedule.time_start < lesson1.time_end) & (Schedule.time_end >= lesson1.time_end)) |
                    ((Schedule.time_start >= lesson1.time_start) & (Schedule.time_end <= lesson1.time_end))
                ).all()

                for c in group_conflicts:
                    conflicts_for_lesson2.append({
                        'id': c.id,
                        'subject': c.subject,
                        'group_name': c.group_name,
                        'teacher_name': c.teacher_name,
                        'auditory': c.auditory,
                        'time_start': c.time_start,
                        'time_end': c.time_end,
                        'conflict_type': 'group',
                        'conflict_value': lesson2.group_name
                    })

            if conflicts_for_lesson2:
                conflicts.append({
                    'lesson_id': lesson2_id,
                    'subject': lesson2.subject,
                    'conflicts': conflicts_for_lesson2
                })

            if conflicts:
                return jsonify({
                    'message': 'Обнаружены конфликты при обмене занятиями',
                    'conflicts': conflicts
                }), 409

        # Perform the swap of time and location information
        lesson1.date = lesson2_date
        lesson1.weekday = lesson2_weekday
        lesson1.time_start = lesson2_time_start
        lesson1.time_end = lesson2_time_end

        lesson2.date = lesson1_date
        lesson2.weekday = lesson1_weekday
        lesson2.time_start = lesson1_time_start
        lesson2.time_end = lesson1_time_end

        # Also swap locations if requested
        if data.get('swap_locations', False):
            lesson1.auditory = lesson2_auditory
            lesson2.auditory = lesson1_auditory

        # Commit changes
        db.session.commit()

        return jsonify({
            'message': 'Занятия успешно поменяны местами',
            'lesson1': lesson1.to_dict(),
            'lesson2': lesson2.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Ошибка при обмене занятиями: {str(e)}'}), 500


@app.route('/api/schedule/conflicts', methods=['POST'])
@token_required
def get_conflicts(current_user):
    """Get detailed information about all conflicts for a specific time slot"""
    data = request.get_json()

    # Required parameters
    date = data.get('date')
    time_start = data.get('time_start')
    time_end = data.get('time_end')

    if not all([date, time_start, time_end]):
        return jsonify({'message': 'Missing required parameters'}), 400

    try:
        # Convert string date to Date object if needed
        if isinstance(date, str):
            try:
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'message': 'Неверный формат даты. Используйте YYYY-MM-DD.'}), 400
        else:
            date_obj = date

        # Find all lessons at the given time slot
        lessons = Schedule.query.filter(
            Schedule.date == date_obj,
            Schedule.time_start == time_start,
            Schedule.time_end == time_end
        ).all()

        # Group lessons by conflict type
        teacher_conflicts = {}
        auditory_conflicts = {}
        group_conflicts = {}

        for lesson in lessons:
            # Group by teacher
            if lesson.teacher_name:
                if lesson.teacher_name not in teacher_conflicts:
                    teacher_conflicts[lesson.teacher_name] = []
                teacher_conflicts[lesson.teacher_name].append(lesson.to_dict())

            # Group by auditory
            if lesson.auditory:
                if lesson.auditory not in auditory_conflicts:
                    auditory_conflicts[lesson.auditory] = []
                auditory_conflicts[lesson.auditory].append(lesson.to_dict())

            # Group by group
            if lesson.group_name:
                if lesson.group_name not in group_conflicts:
                    group_conflicts[lesson.group_name] = []
                group_conflicts[lesson.group_name].append(lesson.to_dict())

        # Find actual conflicts (where there are multiple lessons for the same resource)
        actual_teacher_conflicts = {teacher: lessons for teacher, lessons in teacher_conflicts.items() if
                                    len(lessons) > 1}
        actual_auditory_conflicts = {auditory: lessons for auditory, lessons in auditory_conflicts.items() if
                                     len(lessons) > 1}
        actual_group_conflicts = {group: lessons for group, lessons in group_conflicts.items() if len(lessons) > 1}

        return jsonify({
            'date': date,
            'time_start': time_start,
            'time_end': time_end,
            'teacher_conflicts': actual_teacher_conflicts,
            'auditory_conflicts': actual_auditory_conflicts,
            'group_conflicts': actual_group_conflicts,
            'all_lessons': [lesson.to_dict() for lesson in lessons]
        }), 200

    except Exception as e:
        return jsonify({'message': f'Ошибка при получении конфликтов: {str(e)}'}), 500

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
        problem_files = []  # Список для хранения информации о проблемных файлах

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
                if not isinstance(data, list):
                    problem_files.append({
                        'file': file.filename,
                        'error': 'Неверный формат данных (ожидается массив)'
                    })
                    continue

                file_has_timetable = False

                # Обрабатываем каждый объект в массиве данных
                for item in data:
                    if 'timetable' not in item:
                        continue

                    file_has_timetable = True
                    timetable = item['timetable']

                    # Собираем информацию о неделях
                    for week_data in timetable:
                        week_number = week_data.get('week_number')
                        date_start = week_data.get('date_start')
                        date_end = week_data.get('date_end')

                        if week_number is None:
                            problem_files.append({
                                'file': file.filename,
                                'error': 'Отсутствует номер недели в данных',
                                'week_data': week_data
                            })
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

                # Проверяем, содержал ли файл вообще таблицу расписания
                if not file_has_timetable:
                    problem_files.append({
                        'file': file.filename,
                        'error': 'Файл не содержит данных о расписании (отсутствует ключ "timetable")'
                    })

            except Exception as e:
                # Логируем ошибку для каждого файла и добавляем в список проблемных файлов
                print(f"Ошибка обработки файла {file.filename}: {str(e)}")
                problem_files.append({
                    'file': file.filename,
                    'error': f"Ошибка обработки файла: {str(e)}"
                })
                continue

        # Преобразуем словарь в список для ответа
        weeks_list = list(weeks_info.values())

        # Сортируем недели по номеру
        weeks_list.sort(key=lambda x: x['week_number'])

        if not weeks_list:
            return jsonify({
                'message': 'Не удалось извлечь данные о неделях из загруженных файлов. Проверьте формат файлов.',
                'problem_files': problem_files,
                'problem_files_count': len(problem_files)
            }), 400

        # Сохраняем информацию о проблемных файлах в отдельный файл
        if problem_files:
            try:
                with open('problem_files_analysis.json', 'w', encoding='utf-8') as f:
                    json.dump(problem_files, f, ensure_ascii=False, indent=2)
            except Exception as file_write_error:
                print(f"Ошибка при сохранении информации о проблемных файлах: {str(file_write_error)}")

        return jsonify({
            'weeks': weeks_list,
            'total_lessons': total_lessons,
            'files_count': len(files),
            'problem_files': problem_files,
            'problem_files_count': len(problem_files)
        }), 200

    except Exception as e:
        return jsonify({'message': f'Ошибка при анализе файлов: {str(e)}'}), 500


@app.route('/api/schedule/week', methods=['DELETE'])
@token_required
@admin_required
def delete_schedule_by_week(current_user):
    semester = request.args.get('semester', type=int)
    week_number = request.args.get('week_number', type=int)

    if not semester or not week_number:
        return jsonify({'message': 'Необходимо указать семестр и номер недели'}), 400

    try:
        # Delete all schedule items for the specified week
        deleted = Schedule.query.filter_by(
            semester=semester,
            week_number=week_number
        ).delete()

        db.session.commit()

        return jsonify({
            'message': f'Успешно удалено {deleted} записей расписания для недели {week_number} семестра {semester}',
            'deleted_count': deleted
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Ошибка при удалении расписания: {str(e)}'}), 500

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

        # Список для хранения проблемных пар
        problem_lessons = []

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
                    # Заменяем одиночные \ на \\, только если они не экранируют специальные символы
                    return re.sub(r'\\(?!["\\/bfnrt])', r'\\\\', content)

                # Ищем все строковые литералы в JSON и фиксируем в них обратные слеши
                fixed_content = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', fix_backslashes, content)

                # Парсим JSON
                data = json.loads(fixed_content)

                # Проверяем формат данных
                if not isinstance(data, list):
                    continue

                # Обрабатываем каждый объект в массиве данных
                for item in data:
                    if 'timetable' not in item:
                        continue

                    timetable = item['timetable']

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
                                            try:
                                                day, month, year = date_str.split('-')
                                                date = datetime.strptime(f"{year}-{month}-{day}", '%Y-%m-%d').date()
                                            except (ValueError, TypeError) as e:
                                                # Сохраняем информацию о проблемной паре
                                                problem_lessons.append({
                                                    'file': file.filename,
                                                    'week': week_number,
                                                    'group': group_name,
                                                    'subject': subject,
                                                    'date': date_str,
                                                    'error': f'Ошибка формата даты: {str(e)}',
                                                    'raw_data': lesson
                                                })
                                                failed_count += 1
                                                continue
                                        else:
                                            # Если даты нет, это проблема
                                            problem_lessons.append({
                                                'file': file.filename,
                                                'week': week_number,
                                                'group': group_name,
                                                'subject': subject,
                                                'error': 'Отсутствует дата занятия',
                                                'raw_data': lesson
                                            })
                                            failed_count += 1
                                            continue

                                        # Получаем имя преподавателя и аудиторию
                                        teacher_name = ""
                                        auditory = ""

                                        if 'teachers' in lesson and lesson['teachers']:
                                            teacher_name = lesson['teachers'][0].get('teacher_name', '')

                                        if 'auditories' in lesson and lesson['auditories']:
                                            auditory = lesson['auditories'][0].get('auditory_name', '')

                                        # Проверка обязательных полей
                                        if not all([subject, time_start, time_end, weekday is not None]):
                                            problem_lessons.append({
                                                'file': file.filename,
                                                'week': week_number,
                                                'group': group_name,
                                                'subject': subject,
                                                'date': date_str,
                                                'error': 'Отсутствуют обязательные поля (предмет, время начала/окончания, день недели)',
                                                'raw_data': lesson
                                            })
                                            failed_count += 1
                                            continue

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
                                        # Сохраняем подробную информацию о проблеме
                                        problem_lessons.append({
                                            'file': file.filename,
                                            'week': week_number,
                                            'group': group_name,
                                            'subject': lesson.get('subject', 'Неизвестно'),
                                            'date': lesson.get('date', 'Неизвестно'),
                                            'time': f"{lesson.get('time_start', 'Н/Д')}-{lesson.get('time_end', 'Н/Д')}",
                                            'error': str(e),
                                            'raw_data': lesson
                                        })
                                        continue
            except Exception as e:
                # Сохраняем ошибку обработки файла
                problem_lessons.append({
                    'file': file.filename,
                    'error': f"Ошибка обработки файла: {str(e)}",
                    'is_file_error': True
                })
                continue

        # Сохраняем изменения в БД
        db.session.commit()

        # Сохраняем проблемные пары в файл или базу данных
        if problem_lessons:
            # Вариант 1: Сохранение в файл
            try:
                with open('problem_lessons.json', 'w', encoding='utf-8') as f:
                    json.dump(problem_lessons, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"Ошибка при сохранении проблемных пар в файл: {str(e)}")

            # Вариант 2: Сохранение в базу данных
            # Здесь можно добавить код для сохранения в БД, если нужно

        return jsonify({
            'message': f'Импорт завершен. Добавлено: {imported_count}, не удалось импортировать: {failed_count} занятий.',
            'imported_count': imported_count,
            'updated_count': updated_count,
            'failed_count': failed_count,
            'processed_groups': len(processed_groups),
            'problem_lessons': problem_lessons,  # Возвращаем список проблемных пар
            'problem_lessons_count': len(problem_lessons)
        }), 200

    except Exception as e:
        db.session.rollback()
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


@app.route('/api/lesson_types', methods=['GET'])
@token_required
def get_lesson_types(current_user):
    lesson_types = LessonType.query.all()
    return jsonify([lesson_type.to_dict() for lesson_type in lesson_types]), 200


# Create a new lesson type
@app.route('/api/lesson_types', methods=['POST'])
@token_required
@admin_required
def create_lesson_type(current_user):
    data = request.get_json()

    # Validate required fields
    if 'type_name' not in data or not data['type_name']:
        return jsonify({'message': 'Название типа занятия обязательно!'}), 400

    if 'db_values' not in data or not data['db_values'] or len(data['db_values']) == 0:
        return jsonify({'message': 'Хотя бы одно обозначение в БД обязательно!'}), 400

    # Create a new lesson type
    new_lesson_type = LessonType(
        type_name=data['type_name'],
        db_values=json.dumps(data['db_values']),  # Store as JSON string
        full_name=data.get('full_name', ''),
        hours_multiplier=data.get('hours_multiplier', 2),
        color=data.get('color', '#E9F0FC')
    )

    db.session.add(new_lesson_type)
    db.session.commit()

    return jsonify(new_lesson_type.to_dict()), 201


# Update a lesson type
@app.route('/api/lesson_types/<int:id>', methods=['PUT'])
@token_required
@admin_required
def update_lesson_type(current_user, id):
    lesson_type = LessonType.query.get_or_404(id)
    data = request.get_json()

    # Validate required fields
    if 'type_name' in data and not data['type_name']:
        return jsonify({'message': 'Название типа занятия обязательно!'}), 400

    if 'db_values' in data and (not data['db_values'] or len(data['db_values']) == 0):
        return jsonify({'message': 'Хотя бы одно обозначение в БД обязательно!'}), 400

    # Update fields
    if 'type_name' in data:
        lesson_type.type_name = data['type_name']
    if 'db_values' in data:
        lesson_type.db_values = json.dumps(data['db_values'])
    if 'full_name' in data:
        lesson_type.full_name = data['full_name']
    if 'hours_multiplier' in data:
        lesson_type.hours_multiplier = data['hours_multiplier']
    if 'color' in data:
        lesson_type.color = data['color']

    lesson_type.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify(lesson_type.to_dict()), 200


# Delete a lesson type
@app.route('/api/lesson_types/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_lesson_type(current_user, id):
    lesson_type = LessonType.query.get_or_404(id)

    db.session.delete(lesson_type)
    db.session.commit()

    return jsonify({'message': 'Тип занятия успешно удален!'}), 200


# Export lesson types to JSON
@app.route('/api/lesson_types/export', methods=['GET'])
@token_required
@admin_required
def export_lesson_types(current_user):
    lesson_types = LessonType.query.all()
    lesson_types_data = [lesson_type.to_dict() for lesson_type in lesson_types]

    return jsonify(lesson_types_data), 200


# Import lesson types from JSON
@app.route('/api/lesson_types/import', methods=['POST'])
@token_required
@admin_required
def import_lesson_types(current_user):
    if 'file' not in request.files:
        return jsonify({'message': 'Файл отсутствует!'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'Файл не выбран!'}), 400

    try:
        data = json.loads(file.read().decode('utf-8'))

        # Validate data structure
        if not isinstance(data, list):
            return jsonify({'message': 'Неверный формат данных!'}), 400

        # Clear existing lesson types if requested
        clear_existing = request.form.get('clear_existing') == 'true'
        if clear_existing:
            LessonType.query.delete()

        # Import lesson types
        imported_count = 0
        for item in data:
            if 'type_name' not in item or 'db_values' not in item:
                continue

            # Check if the lesson type already exists
            existing = LessonType.query.filter_by(type_name=item['type_name']).first()
            if existing and not clear_existing:
                # Update existing
                existing.db_values = json.dumps(item['db_values'])
                existing.full_name = item.get('full_name', '')
                existing.hours_multiplier = item.get('hours_multiplier', 2)
                existing.color = item.get('color', '#E9F0FC')
                existing.updated_at = datetime.utcnow()
            else:
                # Create new
                new_lesson_type = LessonType(
                    type_name=item['type_name'],
                    db_values=json.dumps(item['db_values']),
                    full_name=item.get('full_name', ''),
                    hours_multiplier=item.get('hours_multiplier', 2),
                    color=item.get('color', '#E9F0FC')
                )
                db.session.add(new_lesson_type)

            imported_count += 1

        db.session.commit()

        return jsonify({
            'message': f'Успешно импортировано {imported_count} типов занятий!',
            'imported_count': imported_count
        }), 200

    except Exception as e:
        return jsonify({'message': f'Ошибка при импорте: {str(e)}'}), 500


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