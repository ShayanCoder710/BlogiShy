import hashlib
import secrets
import re
from datetime import timedelta

from flask import (Flask, abort, flash, redirect, render_template,
                   request, session, url_for)

from config import ADMIN_PASSWORD, ADMIN_USERNAME, COOKIE_DAYS, MYSQL_CONFIG, SECRET_KEY
from extensions import csrf, db


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = MYSQL_CONFIG
    app.config["SECRET_KEY"] = SECRET_KEY
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=COOKIE_DAYS)
    app.config["SESSION_PERMANENT"] = True
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024

    db.init_app(app)
    csrf.init_app(app)

    from models import Blog, User
    with app.app_context():
        db.create_all()

    @app.context_processor
    def inject_user():
        user = None
        if session.get("user_id"):
            user = User.query.get(session["user_id"])
            if user is None:
                session.pop("user_id", None)
        return {"current_user": user}

    @app.template_filter("fa")
    def fa_digits(value):
        return str(value).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))

    @app.after_request
    def no_cache(response):
        if response.content_type and ("text/html" in response.content_type or "css" in response.content_type or "javascript" in response.content_type):
            response.headers["Cache-Control"] = "no-store, max-age=0, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

    @app.route("/")
    def home():
        blogs = Blog.query.filter_by(is_public=True)\
            .order_by(Blog.created_at.desc()).all()
        return render_template("home.html", blogs=blogs)

    @app.route("/register", methods=["GET", "POST"])
    def register():
        if session.get("user_id"):
            return redirect(url_for("home"))
        if request.method == "POST":
            username = request.form.get("username", "").strip()
            name = request.form.get("name", "").strip()
            password = request.form.get("password", "")
            confirm = request.form.get("confirm", "")

            if not re.fullmatch(r"[\w\-]{3,30}", username):
                flash("نام کاربری باید ۳ تا ۳۰ کاراکتر (حروف، اعداد، - و _) باشد.", "error")
                return redirect(url_for("register"))
            if len(name) < 2:
                flash("نام را وارد کنید (حداقل ۲ کاراکتر).", "error")
                return redirect(url_for("register"))

            if len(password) < 6:
                flash("رمز عبور باید حداقل ۶ کاراکتر باشد.", "error")
                return redirect(url_for("register"))
            if password != confirm:
                flash("تکرار رمز عبور با رمز عبور یکسان نیست.", "error")
                return redirect(url_for("register"))
            if User.query.filter_by(username=username).first():
                flash("این نام کاربری قبلاً ثبت شده است.", "error")
                return redirect(url_for("register"))

            salt = secrets.token_hex(16)
            pw_hash = hashlib.sha512((salt + password).encode()).hexdigest()
            user = User(username=username, name=name[:50],
                         salt=salt, password_hash=pw_hash)
            db.session.add(user)
            db.session.commit()
            session["user_id"] = user.id
            session.permanent = True
            flash("حساب کاربری شما ساخته شد. خوش آمدید!", "success")
            return redirect(url_for("home"))
        return render_template("register.html")

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if session.get("user_id"):
            return redirect(url_for("home"))
        if request.method == "POST":
            username = request.form.get("username", "").strip()
            password = request.form.get("password", "")
            user = User.query.filter_by(username=username).first()
            if user is None:
                flash("نام کاربری یا رمز عبور اشتباه است.", "error")
                return redirect(url_for("login"))
            candidate = hashlib.sha512(
                (user.salt + password).encode()).hexdigest()
            if not secrets.compare_digest(candidate, user.password_hash):
                flash("نام کاربری یا رمز عبور اشتباه است.", "error")
                return redirect(url_for("login"))
            session["user_id"] = user.id
            session.permanent = True
            flash("خوش آمدید!", "success")
            return redirect(url_for("home"))
        return render_template("login.html")

    @app.route("/logout")
    def logout():
        session.clear()
        flash("از حساب خارج شدید.", "success")
        return redirect(url_for("home"))

    @app.route("/write", methods=["GET", "POST"])
    def write():
        if not session.get("user_id"):
            flash("برای نوشتن باید وارد شوید.", "error")
            return redirect(url_for("login"))
        user = User.query.get(session["user_id"])

        if request.method == "POST":
            title = request.form.get("title", "").strip()
            body = request.form.get("body", "").strip()
            is_public = request.form.get("visibility") == "public"

            if not title:
                flash("عنوان بلاگ را وارد کنید.", "error")
                return redirect(url_for("write"))
            if not body:
                flash("متن بلاگ را بنویسید.", "error")
                return redirect(url_for("write"))

            token = secrets.token_urlsafe(24)
            blog = Blog(title=title, body=body, token=token,
                       is_public=is_public, user_id=user.id)
            db.session.add(blog)
            db.session.commit()

            blog.url = url_for("view_blog", token=token, _external=True)
            flash("بلاگ شما منتشر شد. لینکش را با دوستتان به اشتراک بگذارید:", "success")
            return render_template("write.html", blog=blog)

        return render_template("write.html", blog=None)

    @app.route("/edit/<int:blog_id>", methods=["GET", "POST"])
    def edit_blog(blog_id):
        if not session.get("user_id"):
            flash("برای ویرایش باید وارد شوید.", "error")
            return redirect(url_for("login"))
        blog = Blog.query.get(blog_id)
        if blog is None or blog.user_id != session["user_id"]:
            abort(404)

        if request.method == "POST":
            title = request.form.get("title", "").strip()
            body = request.form.get("body", "").strip()
            is_public = request.form.get("visibility") == "public"

            if not title:
                flash("عنوان بلاگ را وارد کنید.", "error")
                return redirect(url_for("edit_blog", blog_id=blog.id))
            if not body:
                flash("متن بلاگ را بنویسید.", "error")
                return redirect(url_for("edit_blog", blog_id=blog.id))

            blog.title = title
            blog.body = body
            blog.is_public = is_public
            db.session.commit()
            flash("بلاگ به روز شد.", "success")
            return redirect(url_for("profile"))

        return render_template("write.html", blog=blog)

    @app.route("/post/<token>")
    def view_blog(token):
        blog = Blog.query.filter_by(token=token).first()
        if blog is None:
            abort(404)
        author = User.query.get(blog.user_id)
        is_owner = session.get("user_id") == blog.user_id
        if not blog.is_public and not is_owner:
            flash("این بلاگ خصوصی است و فقط نویسنده‌اش می‌تواند آن را ببیند.", "error")
            return redirect(url_for("home"))
        return render_template("blog.html", blog=blog, author=author,
                               is_owner=is_owner)

    @app.route("/settings", methods=["GET", "POST"])
    def settings():
        if not session.get("user_id"):
            flash("برای تغییرات باید وارد شوید.", "error")
            return redirect(url_for("login"))
        user = User.query.get(session["user_id"])

        if request.method == "POST":
            which = request.form.get("which")
            if which == "username":
                username = request.form.get("username", "").strip()
                if username == user.username:
                    flash("نام کاربری تغییر نکرده است.", "error")
                    return redirect(url_for("settings"))
                if not re.fullmatch(r"[\w\-]{3,30}", username):
                    flash("نام کاربری باید ۳ تا ۳۰ کاراکتر (حروف، اعداد، - و _) باشد.", "error")
                    return redirect(url_for("settings"))
                if User.query.filter_by(username=username).first():
                    flash("این نام کاربری قبلاً ثبت شده است.", "error")
                    return redirect(url_for("settings"))
                user.username = username
                db.session.commit()
                flash("نام کاربری تغییر کرد.", "success")

            elif which == "password":
                current = request.form.get("current", "")
                new_password = request.form.get("new", "")
                confirm = request.form.get("confirm", "")
                candidate = hashlib.sha512(
                    (user.salt + current).encode()).hexdigest()
                if not secrets.compare_digest(candidate, user.password_hash):
                    flash("رمز عبور فعلی اشتباه است.", "error")
                    return redirect(url_for("settings"))
                if len(new_password) < 6:
                    flash("رمز عبور جدید باید حداقل ۶ کاراکتر باشد.", "error")
                    return redirect(url_for("settings"))
                if new_password != confirm:
                    flash("تکرار رمز عبور با رمز عبور یکسان نیست.", "error")
                    return redirect(url_for("settings"))
                user.salt = secrets.token_hex(16)
                user.password_hash = hashlib.sha512(
                    (user.salt + new_password).encode()).hexdigest()
                db.session.commit()
                flash("رمز عبور تغییر کرد.", "success")
            else:
                return redirect(url_for("settings"))
            return redirect(url_for("settings"))
        return render_template("settings.html", user=user)

    @app.route("/profile")
    def profile():
        if not session.get("user_id"):
            flash("برای دیدن پروفایل باید وارد شوید.", "error")
            return redirect(url_for("login"))
        user = User.query.get(session["user_id"])
        blogs = Blog.query.filter_by(user_id=user.id)\
            .order_by(Blog.created_at.desc()).all()
        return render_template("profile.html", user=user, blogs=blogs)

    @app.route("/delete/<int:blog_id>", methods=["POST"])
    def delete_blog(blog_id):
        if not session.get("user_id"):
            abort(404)
        blog = Blog.query.get(blog_id)
        if blog is None or blog.user_id != session["user_id"]:
            abort(404)
        db.session.delete(blog)
        db.session.commit()
        flash("بلاگ حذف شد.", "success")
        return redirect(url_for("profile"))

    @app.route("/toggle/<int:blog_id>", methods=["POST"])
    def toggle_blog(blog_id):
        if not session.get("user_id"):
            abort(404)
        blog = Blog.query.get(blog_id)
        if blog is None or blog.user_id != session["user_id"]:
            abort(404)
        blog.is_public = not blog.is_public
        db.session.commit()
        flash("وضعیت عمومی/خصوصی بلاگ تغییر کرد.", "success")
        return redirect(url_for("profile"))

    @app.route("/admin", methods=["GET", "POST"])
    def admin():
        if not session.get("admin"):
            if request.method == "POST":
                if (request.form.get("admin_username") == ADMIN_USERNAME
                        and request.form.get("admin_password") == ADMIN_PASSWORD):
                    session["admin"] = True
                    session.permanent = True
                    flash("به پنل ادمین خوش آمدید.", "success")
                    return redirect(url_for("admin"))
                else:
                    flash("نام کاربری یا رمز ادمین اشتباه است.", "error")
                    return redirect(url_for("admin"))
            return render_template("admin.html")
        users = User.query.all()
        blogs = Blog.query.order_by(Blog.created_at.desc()).all()
        return render_template("admin.html", users=users, blogs=blogs)

    @app.route("/admin/logout")
    def admin_logout():
        session.pop("admin", None)
        flash("از پنل ادمین خارج شدید.", "success")
        return redirect(url_for("admin"))

    @app.route("/admin/delete-user/<int:user_id>", methods=["POST"])
    def admin_delete_user(user_id):
        if not session.get("admin"):
            abort(404)
        user = User.query.get(user_id)
        if user is None:
            abort(404)
        db.session.delete(user)
        db.session.commit()
        flash("کاربر و بلاگ‌هایش حذف شد.", "success")
        return redirect(url_for("admin"))

    @app.route("/admin/delete-blog/<int:blog_id>", methods=["POST"])
    def admin_delete_blog(blog_id):
        if not session.get("admin"):
            abort(404)
        blog = Blog.query.get(blog_id)
        if blog is None:
            abort(404)
        db.session.delete(blog)
        db.session.commit()
        flash("بلاگ حذف شد.", "success")
        return redirect(url_for("admin"))

    @app.route("/admin/toggle-blog/<int:blog_id>", methods=["POST"])
    def admin_toggle_blog(blog_id):
        if not session.get("admin"):
            abort(404)
        blog = Blog.query.get(blog_id)
        if blog is None:
            abort(404)
        blog.is_public = not blog.is_public
        db.session.commit()
        flash("وضعیت عمومی/خصوصی بلاگ تغییر کرد.", "success")
        return redirect(url_for("admin"))

    @app.errorhandler(404)
    def not_found(e):
        return render_template("404.html"), 404

    return app


app = create_app()
