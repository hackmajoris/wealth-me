#!/usr/bin/env python3
"""Copy wealth.db.bk -> wealth.db, randomizing all monetary amounts."""

import sqlite3
import random
import shutil
import os

random.seed()  # different each run

SRC = "data/wealth.db.bk"
DST = "data/wealth.db"

# Copy schema + structure
if os.path.exists(DST):
    os.remove(DST)
shutil.copy2(SRC, DST)

src = sqlite3.connect(SRC)
dst = sqlite3.connect(DST)

src.row_factory = sqlite3.Row


def jitter(value, lo=0.55, hi=1.45):
    """Multiply a non-zero value by a random factor in [lo, hi]."""
    if value == 0:
        return 0.0
    return round(value * random.uniform(lo, hi), 2)


# ── entries ──────────────────────────────────────────────────────────────────
dst.execute("DELETE FROM entries")
for r in src.execute("SELECT * FROM entries"):
    dst.execute(
        """INSERT INTO entries
           (id, month, month_full, yr, mo,
            crypto_invested, crypto_return, stocks_invested, stocks_return,
            note, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (
            r["id"], r["month"], r["month_full"], r["yr"], r["mo"],
            jitter(r["crypto_invested"]),
            jitter(r["crypto_return"]),
            jitter(r["stocks_invested"]),
            jitter(r["stocks_return"]),
            r["note"], r["created_at"],
        ),
    )

# ── savings ───────────────────────────────────────────────────────────────────
dst.execute("DELETE FROM savings")
for r in src.execute("SELECT * FROM savings"):
    ni   = jitter(r["net_income"])
    exp  = jitter(r["total_expenses"])
    sav  = round(ni - exp, 2)
    rate = round((sav / ni * 100), 4) if ni else 0.0
    dst.execute(
        """INSERT INTO savings
           (id, month, month_full, yr, mo,
            net_income, total_expenses, savings, saving_rate, target,
            note, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            r["id"], r["month"], r["month_full"], r["yr"], r["mo"],
            ni, exp, sav, rate,
            jitter(r["target"]) if r["target"] else 0.0,
            r["note"], r["updated_at"],
        ),
    )

# ── settings ─────────────────────────────────────────────────────────────────
# Keep non-monetary keys (currency codes, rates, target %) as-is
KEEP_SETTINGS = {"currency", "debts_currency", "assets_currency",
                 "rate_eur_to_ron", "rate_usd_to_ron", "savings_target"}
dst.execute("DELETE FROM settings")
for r in src.execute("SELECT * FROM settings"):
    if r["key"] in KEEP_SETTINGS:
        dst.execute(
            "INSERT INTO settings (key, value, value_string) VALUES (?,?,?)",
            (r["key"], r["value"], r["value_string"]),
        )
    else:
        dst.execute(
            "INSERT INTO settings (key, value, value_string) VALUES (?,?,?)",
            (r["key"], jitter(r["value"]), r["value_string"]),
        )

# ── assets ────────────────────────────────────────────────────────────────────
dst.execute("DELETE FROM assets")
for r in src.execute("SELECT * FROM assets"):
    dst.execute(
        """INSERT INTO assets
           (id, name, category, value, purchase_price, purchase_date,
            note, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (
            r["id"], r["name"], r["category"],
            jitter(r["value"]),
            jitter(r["purchase_price"]),
            r["purchase_date"], r["note"], r["created_at"], r["updated_at"],
        ),
    )

# ── debts ─────────────────────────────────────────────────────────────────────
dst.execute("DELETE FROM debts")
for r in src.execute("SELECT * FROM debts"):
    dst.execute(
        """INSERT INTO debts
           (id, name, category, balance, credit_limit, interest_rate,
            minimum_payment, note, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            r["id"], r["name"], r["category"],
            jitter(r["balance"]),
            jitter(r["credit_limit"]),
            jitter(r["interest_rate"]) if r["interest_rate"] else 0.0,
            jitter(r["minimum_payment"]) if r["minimum_payment"] else 0.0,
            r["note"], r["created_at"], r["updated_at"],
        ),
    )

# ── asset_history ─────────────────────────────────────────────────────────────
dst.execute("DELETE FROM asset_history")
for r in src.execute("SELECT * FROM asset_history"):
    dst.execute(
        "INSERT INTO asset_history (date, total_value) VALUES (?,?)",
        (r["date"], jitter(r["total_value"])),
    )

# ── debt_history ──────────────────────────────────────────────────────────────
dst.execute("DELETE FROM debt_history")
for r in src.execute("SELECT * FROM debt_history"):
    dst.execute(
        "INSERT INTO debt_history (date, total_debt) VALUES (?,?)",
        (r["date"], jitter(r["total_debt"])),
    )

# ── asset_entries ─────────────────────────────────────────────────────────────
dst.execute("DELETE FROM asset_entries")
for r in src.execute("SELECT * FROM asset_entries"):
    dst.execute(
        """INSERT INTO asset_entries
           (id, date, name, category, amount, note, created_at)
           VALUES (?,?,?,?,?,?,?)""",
        (
            r["id"], r["date"], r["name"], r["category"],
            jitter(r["amount"]),
            r["note"], r["created_at"],
        ),
    )

# ── debt_entries ──────────────────────────────────────────────────────────────
dst.execute("DELETE FROM debt_entries")
for r in src.execute("SELECT * FROM debt_entries"):
    dst.execute(
        """INSERT INTO debt_entries
           (id, date, name, category, amount, note, created_at, currency)
           VALUES (?,?,?,?,?,?,?,?)""",
        (
            r["id"], r["date"], r["name"], r["category"],
            jitter(r["amount"]),
            r["note"], r["created_at"], r["currency"],
        ),
    )

dst.commit()
src.close()
dst.close()

print("Done. Verifying row counts...")
import subprocess
for tbl in ["entries", "savings", "settings", "assets", "debts",
            "asset_history", "debt_history", "asset_entries", "debt_entries"]:
    bk = subprocess.check_output(
        ["sqlite3", SRC, f"SELECT COUNT(*) FROM {tbl}"], text=True).strip()
    dv = subprocess.check_output(
        ["sqlite3", DST, f"SELECT COUNT(*) FROM {tbl}"], text=True).strip()
    status = "OK" if bk == dv else "MISMATCH"
    print(f"  {tbl:<18} bk={bk:>4}  dst={dv:>4}  {status}")
