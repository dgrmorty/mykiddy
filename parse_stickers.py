import csv
import re

data = """MEX 17 (2)
RSA 2 6
KOR 11
CZE 3 11 12
MAR 8 11 20
HAI 1 10 16
SCO 2 8 17
GER 3 13 (3) 14 7
CUW 1 (3) 13 10 14 16
CIV 2 14 (2) 20 18 10
ECU 8 (2) 19 12
BEL 1 7
EGY 4 10 15 19
IRN 12 14 19
SEN 10 12 17 18
NZL 2 (3) 9
IRQ 5 7 8 (3) 17
NOR 9 (2) 17 18 20
POR 6 11 17 (2) 
COD 19
UZB 1 4
COL 3 4 16 (2)
CAN 1 7 15
BIH 2 
QAT 5 7 10 (2) 
SUI 1 (2) 2 15 16
USA 5 19
PAR 1 13 
AUS 7
TUR 6 10 11
NED 7 (2) 10 18
JPN 2 3 6 19(2)
SWE 6 10
TUN 6 11 (2)
ESP 8 (2)
CPV 1 11 16
KSA 6 13 15
URU 10 (2) 16 
ARG 1 5 (2) 7 12 (2) 13 20
ALG 4 (2) 16 18
AUT 14 (4) 16 (2)
JOR 1 18
ENG 14
CRO 2 3 10 13 18
GHA 3 9 19 
PAN 5 (2) 19
FWC 13 16"""

rows = []
for line in data.strip().split('\n'):
    parts = line.strip().split()
    if not parts: continue
    team = parts[0]
    
    rest = " ".join(parts[1:])
    matches = re.finditer(r'(\d+)\s*(?:\((\d+)\))?', rest)
    for m in matches:
        sticker = m.group(1)
        qty = m.group(2) if m.group(2) else "1"
        rows.append([team, sticker, qty])

with open('panini_wc26_duplicates.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Команда', 'Номер наклейки', 'Количество'])
    writer.writerows(rows)
