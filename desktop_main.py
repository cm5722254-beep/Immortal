import sys
import json
import os
import datetime
import logging
import requests
import qrcode
from io import BytesIO
from urllib.parse import quote

from PyQt5.QtWidgets import (QApplication, QMainWindow, QDialog, QVBoxLayout,
                             QLabel, QPushButton, QMessageBox, QHBoxLayout)
from PyQt5.QtCore import QTimer, Qt
from PyQt5.QtGui import QPixmap, QImage, QFont

# ==========================================
# CONFIGURATION
# ==========================================
APP_NAME = "MerDonghua Anime"
PRICE_AMOUNT = "1.50"
CURRENCY = "USD"
API_TOKEN = "1590108099:36dfa58ec89bda8f089044bd7fe87bda"
BASE_URL = "https://mengsmm.store/api/v1/"

# Updated Bakong Details
BAKONG_ACCOUNT_ID = "merdonghua_anime@bkrt"
MERCHANT_NAME = "MerDonghua Anime"
MERCHANT_CITY = "Phnom Penh"

LICENSE_FILE = "license_state.json"
LOG_FILE = "payment_debug.log"

# Set up logging
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# ==========================================
# LICENSE MANAGER
# ==========================================
class LicenseManager:
    @staticmethod
    def is_license_valid():
        """Checks if a local license exists and is not expired."""
        if not os.path.exists(LICENSE_FILE):
            return False
        try:
            with open(LICENSE_FILE, 'r') as f:
                data = json.load(f)
            
            expires_at_str = data.get("expires_at")
            if not expires_at_str:
                return False
                
            expires_at = datetime.datetime.fromisoformat(expires_at_str)
            now = datetime.datetime.now(datetime.timezone.utc)
            
            if now < expires_at:
                logging.info("Valid license found.")
                return True
            else:
                logging.info("License found but expired.")
                return False
                
        except Exception as e:
            logging.error(f"Error reading license file: {e}")
            return False

    @staticmethod
    def save_license(bill_number, md5):
        """Activates license for 365 days and saves it."""
        now = datetime.datetime.now(datetime.timezone.utc)
        expires = now + datetime.timedelta(days=365)
        
        data = {
            "bill_number": bill_number,
            "md5": md5,
            "activated_at": now.isoformat(),
            "expires_at": expires.isoformat()
        }
        try:
            with open(LICENSE_FILE, 'w') as f:
                json.dump(data, f, indent=4)
            logging.info(f"License saved successfully. Expires at: {expires.isoformat()}")
        except Exception as e:
            logging.error(f"Failed to save license: {e}")

# ==========================================
# PAYMENT DIALOG (GATEWAY)
# ==========================================
class PaymentDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle(f"{APP_NAME} - Activation")
        self.setFixedSize(400, 600)
        
        self.current_bill_number = None
        self.current_md5 = None
        self.known_expired_md5s = set() 
        
        self.layout = QVBoxLayout()
        
        title = QLabel(f"Unlock {APP_NAME}")
        title.setFont(QFont("Arial", 16, QFont.Bold))
        title.setAlignment(Qt.AlignCenter)
        self.layout.addWidget(title)
        
        self.info_label = QLabel(
            f"Price: ${PRICE_AMOUNT} {CURRENCY}\n"
            f"Duration: 1 Year\n"
            f"Pay to: {BAKONG_ACCOUNT_ID}"
        )
        self.info_label.setAlignment(Qt.AlignCenter)
        self.layout.addWidget(self.info_label)
        
        self.qr_label = QLabel("Loading QR Code...")
        self.qr_label.setAlignment(Qt.AlignCenter)
        self.qr_label.setMinimumSize(300, 300)
        self.layout.addWidget(self.qr_label)
        
        self.status_label = QLabel("Initializing...")
        self.status_label.setAlignment(Qt.AlignCenter)
        self.status_label.setStyleSheet("color: blue; font-weight: bold;")
        self.layout.addWidget(self.status_label)
        
        btn_layout = QHBoxLayout()
        self.btn_check = QPushButton("Check Now")
        self.btn_check.clicked.connect(self.check_payment_status)
        btn_layout.addWidget(self.btn_check)
        
        self.btn_refresh = QPushButton("Get New QR")
        self.btn_refresh.clicked.connect(self.generate_qr)
        btn_layout.addWidget(self.btn_refresh)
        
        self.layout.addLayout(btn_layout)
        self.setLayout(self.layout)
        
        self.poll_timer = QTimer(self)
        self.poll_timer.timeout.connect(self.check_payment_status)
        
        self.generate_qr()

    def generate_qr(self):
        """Fetches a new KHQR code from the API."""
        self.poll_timer.stop()
        self.status_label.setText("Requesting new payment QR...")
        self.status_label.setStyleSheet("color: blue;")
        QApplication.processEvents()
        
        # Injected the new Bakong parameters in case the API supports dynamic overrides
        encoded_name = quote(MERCHANT_NAME)
        url = (f"{BASE_URL}?type=generate_qr&amount={PRICE_AMOUNT}&currency={CURRENCY}"
               f"&api_token={API_TOKEN}&bakong_account={BAKONG_ACCOUNT_ID}"
               f"&merchant_name={encoded_name}")
        
        try:
            logging.info(f"Generating QR Request: {url}")
            response = requests.get(url, timeout=10)
            data = response.json()
            logging.debug(f"Generate Response: {json.dumps(data)}")
            
            if data.get("status") == "success" and data.get("success"):
                qr_data = data.get("data", {})
                new_md5 = qr_data.get("md5")
                new_bill = qr_data.get("bill_number")
                
                if new_md5 in self.known_expired_md5s:
                    self.show_backend_error("The payment server returned the same expired QR again. A fresh QR was not created.")
                    return
                
                self.current_md5 = new_md5
                self.current_bill_number = new_bill
                qr_string = qr_data.get("qr_string")
                
                self.render_qr_image(qr_string)
                self.status_label.setText("Awaiting payment...")
                self.status_label.setStyleSheet("color: orange;")
                
                self.poll_timer.start(3000)
            else:
                self.status_label.setText("Failed to generate QR.")
                logging.error("API returned failure for generation.")
                
        except Exception as e:
            logging.error(f"Generate QR Exception: {e}")
            self.status_label.setText("Network error. Try again.")

    def render_qr_image(self, qr_string):
        """Generates a QPixmap from the KHQR string."""
        try:
            qr = qrcode.QRCode(box_size=10, border=4)
            qr.add_data(qr_string)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            
            buf = BytesIO()
            img.save(buf, format="PNG")
            qimg = QImage.fromData(buf.getvalue())
            pixmap = QPixmap.fromImage(qimg).scaled(300, 300, Qt.KeepAspectRatio)
            self.qr_label.setPixmap(pixmap)
        except Exception as e:
            logging.error(f"QR Render Error: {e}")
            self.qr_label.setText("Could not render QR code.")

    def check_payment_status(self):
        """Polls the API for the current payment status."""
        if not self.current_bill_number:
            return
            
        url = f"{BASE_URL}?type=check_md5&bill_number={self.current_bill_number}&api_token={API_TOKEN}"
        
        try:
            logging.info(f"Checking Status Request: {url}")
            response = requests.get(url, timeout=10)
            data = response.json()
            logging.debug(f"Status Response: {json.dumps(data)}")
            
            status = data.get("status", "").upper()
            
            if status in ["SUCCESS", "PAID"]:
                self.poll_timer.stop()
                self.status_label.setText("Payment Successful! Activating...")
                self.status_label.setStyleSheet("color: green;")
                logging.info("Payment SUCCESS.")
                
                LicenseManager.save_license(self.current_bill_number, self.current_md5)
                self.accept()
                
            elif status == "PENDING":
                time_rem = data.get("time_remaining_seconds")
                msg = f"Pending... ({time_rem}s remaining)" if time_rem else "Waiting for payment..."
                self.status_label.setText(msg)
                
            elif status == "EXPIRED":
                self.poll_timer.stop()
                self.status_label.setText("QR Expired. Please get a new QR.")
                self.status_label.setStyleSheet("color: red;")
                self.known_expired_md5s.add(self.current_md5)
                logging.warning(f"QR Expired. MD5 {self.current_md5} added to blacklist.")
                
            else:
                logging.warning(f"Unknown status received: {status}")
                
        except Exception as e:
            logging.error(f"Status Check Exception: {e}")

    def show_backend_error(self, message):
        """Displays an error when the backend malfunctions."""
        self.poll_timer.stop()
        self.status_label.setText("Backend Error Detected.")
        self.status_label.setStyleSheet("color: red;")
        self.qr_label.clear()
        self.qr_label.setText("Cannot display QR.")
        logging.critical(f"BACKEND ERROR: {message}")
        
        msg = QMessageBox(self)
        msg.setIcon(QMessageBox.Critical)
        msg.setWindowTitle("Server Error")
        msg.setText(message)
        msg.exec_()

# ==========================================
# MAIN APPLICATION WINDOW
# ==========================================
class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle(APP_NAME)
        self.setMinimumSize(800, 600)
        
        main_label = QLabel(f"Welcome to {APP_NAME}!\n\nYour 1-year premium license is active.\nEnjoy your Donghua!")
        main_label.setAlignment(Qt.AlignCenter)
        main_label.setFont(QFont("Arial", 18, QFont.Bold))
        self.setCentralWidget(main_label)
        
        logging.info("Main application launched successfully.")

# ==========================================
# BOOTSTRAP LOGIC
# ==========================================
def main():
    app = QApplication(sys.argv)
    logging.info(f"--- Starting {APP_NAME} ---")
    
    if LicenseManager.is_license_valid():
        window = MainWindow()
        window.show()
    else:
        payment_dialog = PaymentDialog()
        result = payment_dialog.exec_()
        
        if result == QDialog.Accepted:
            window = MainWindow()
            window.show()
        else:
            logging.info("User closed the payment gate. Exiting.")
            sys.exit(0)

    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
