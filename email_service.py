import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading

def send_email_async(to_email, subject, body_html):
    smtp_email = os.environ.get('SMTP_EMAIL')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    
    if not smtp_email or not smtp_password:
        print(f"[EmailService] Skipping email to {to_email}. SMTP_EMAIL and SMTP_PASSWORD environment variables are not configured.")
        return
        
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"GIKI Course Hub <{smtp_email}>"
        msg['To'] = to_email

        part = MIMEText(body_html, 'html')
        msg.attach(part)

        # Standard Gmail SMTP configuration (can be adapted if using a different provider)
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(smtp_email, smtp_password)
        server.sendmail(smtp_email, to_email, msg.as_string())
        server.quit()
        print(f"[EmailService] Email successfully sent to {to_email}")
    except Exception as e:
        print(f"[EmailService] Failed to send email to {to_email}: {e}")

def send_email(to_email, subject, body_html):
    """
    Fire-and-forget email sender using threads.
    This prevents the API routes from blocking while the email is being sent.
    """
    if not to_email:
        return
    thread = threading.Thread(target=send_email_async, args=(to_email, subject, body_html))
    thread.daemon = True
    thread.start()
