import hashlib
import time
import uuid
from typing import Optional, Dict, Any
from app.core.config import settings


def crc16_ccitt(data: str) -> str:
    """
    Calculate CRC16-CCITT (polynomial 0x1021, initial value 0xFFFF)
    Standard for EMVCo / Bakong KHQR verification.
    """
    crc = 0xFFFF
    for char in data.encode("utf-8"):
        crc ^= char << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return f"{crc:04X}"


def format_emv_tag(tag: str, value: str) -> str:
    """Format tag and value according to EMVCo standard (Tag + Length + Value)."""
    val_str = str(value)
    length = len(val_str.encode("utf-8"))
    return f"{tag}{length:02d}{val_str}"


def generate_khqr_string(
    merchant_id: str,
    merchant_name: str,
    merchant_city: str = "Phnom Penh",
    amount: float = 2.50,
    currency: str = "USD",
    bill_number: str = "INV001",
    store_label: str = "RIT_ANIME",
    terminal_label: str = "WEB_GATEWAY"
) -> str:
    """
    Generates a valid Bakong / ACLEDA Dynamic KHQR Code string compliant with EMVCo & NBC KHQR Specs.
    """
    # 00: Payload Format Indicator
    tag_00 = format_emv_tag("00", "01")
    
    # 01: Point of Initiation Method (12 = Dynamic QR, 11 = Static QR)
    tag_01 = format_emv_tag("01", "12")
    
    # 29: Merchant Account Information (Canadia Bank / Bakong Retail KHQR)
    sub_tag_00 = format_emv_tag("00", "cadikhppxxx@cadi")
    sub_tag_01 = format_emv_tag("01", "0130000632528")
    sub_tag_02 = format_emv_tag("02", "Canadia Bank")
    merchant_account_info = f"{sub_tag_00}{sub_tag_01}{sub_tag_02}"
    tag_29 = format_emv_tag("29", merchant_account_info)
    
    # 52: Merchant Category Code (0000)
    tag_52 = format_emv_tag("52", "0000")
    
    # 53: Transaction Currency (840 = USD, 116 = KHR)
    currency_code = "840" if currency.upper() == "USD" else "116"
    tag_53 = format_emv_tag("53", currency_code)
    
    # 54: Transaction Amount
    formatted_amount = f"{amount:.2f}" if currency.upper() == "USD" else str(int(amount))
    tag_54 = format_emv_tag("54", formatted_amount)
    
    # 58: Country Code
    tag_58 = format_emv_tag("58", "KH")
    
    # 59: Merchant Name (Up to 25 chars)
    safe_merchant_name = merchant_name[:25] if merchant_name and merchant_name != "MerDonghua Anime" else "KAING BUNCHHAY"
    tag_59 = format_emv_tag("59", safe_merchant_name)
    
    # 60: Merchant City (Up to 15 chars)
    safe_city = merchant_city[:15] if merchant_city else "Phnom Penh"
    tag_60 = format_emv_tag("60", safe_city)
    
    # 62: Additional Data Field Template
    add_01 = format_emv_tag("01", bill_number[:25])  # Bill Number
    add_03 = format_emv_tag("03", store_label[:25])   # Store Label
    add_07 = format_emv_tag("07", terminal_label[:25])# Terminal Label
    add_data_payload = f"{add_01}{add_03}{add_07}"
    tag_62 = format_emv_tag("62", add_data_payload)
    
    # Combine without CRC
    raw_khqr = f"{tag_00}{tag_01}{tag_29}{tag_52}{tag_53}{tag_54}{tag_58}{tag_59}{tag_60}{tag_62}6304"
    
    # Calculate CRC16 and append
    crc = crc16_ccitt(raw_khqr)
    full_khqr = f"{raw_khqr}{crc}"
    
    return full_khqr


def generate_khqr_deeplink(khqr_string: str) -> Dict[str, str]:
    """
    Generates standard deep links to trigger ACLEDA Mobile and Bakong Mobile App
    from mobile browsers.
    """
    import urllib.parse
    encoded_qr = urllib.parse.quote_plus(khqr_string)
    
    return {
        "acleda_deeplink": f"acledamobile://khqr?qr={encoded_qr}",
        "bakong_deeplink": f"bakong://khqr?qr={encoded_qr}",
        "universal_deeplink": f"https://api-bakong.nbc.gov.kh/checkout?qr={encoded_qr}"
    }


def generate_md5_hash(data: str) -> str:
    """Generate MD5 hash for payment verification check."""
    return hashlib.md5(data.encode("utf-8")).hexdigest()
