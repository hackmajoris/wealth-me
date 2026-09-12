package month

import (
	"database/sql"
	"fmt"
	"strconv"
	"time"
)

const moOrderSQL = `CASE mo
	WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3 WHEN 'Apr' THEN 4
	WHEN 'May' THEN 5 WHEN 'Jun' THEN 6 WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8
	WHEN 'Sep' THEN 9 WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
	ELSE 0 END`

const dateSortSQL = `CASE WHEN SUBSTR(date,5,1)='-'
	THEN date
	ELSE (CASE WHEN LENGTH(TRIM(SUBSTR(date,5)))=2 THEN '20'||TRIM(SUBSTR(date,5)) ELSE TRIM(SUBSTR(date,5)) END)
		||'-'||CASE SUBSTR(date,1,3)
		WHEN 'Jan' THEN '01' WHEN 'Feb' THEN '02' WHEN 'Mar' THEN '03'
		WHEN 'Apr' THEN '04' WHEN 'May' THEN '05' WHEN 'Jun' THEN '06'
		WHEN 'Jul' THEN '07' WHEN 'Aug' THEN '08' WHEN 'Sep' THEN '09'
		WHEN 'Oct' THEN '10' WHEN 'Nov' THEN '11' WHEN 'Dec' THEN '12'
		ELSE '00' END||'-01'
END`

var moNames = [12]string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
var moFullNames = [12]string{"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"}

// Init ensures every category has an entry for the current month,
// seeding it from the most recent prior month if one is missing.
func Init(db *sql.DB) error {
	now := time.Now()
	yr := now.Year()
	idx := int(now.Month()) - 1
	mo := moNames[idx]
	yrFull := strconv.Itoa(yr)
	label := mo + " " + yrFull[2:] // "Jul 25" — matches manual-entry convention
	labelFull := moFullNames[idx] + " " + yrFull
	labelDate := label // asset/debt entries use the same "Jul 25" convention

	stmts := []string{
		// entries (stocks + crypto): copy last row if current month absent
		`INSERT OR IGNORE INTO entries
			(month, month_full, yr, mo, crypto_invested, crypto_return, stocks_invested, stocks_return, note)
		SELECT '` + label + `','` + labelFull + `',` + strconv.Itoa(yr) + `,'` + mo + `',
			crypto_invested, crypto_return, stocks_invested, stocks_return, ''
		FROM entries ORDER BY yr DESC, ` + moOrderSQL + ` DESC LIMIT 1`,

		// savings: copy last row if current month absent
		`INSERT OR IGNORE INTO savings
			(month, month_full, yr, mo, net_income, total_expenses, savings, saving_rate, target, note)
		SELECT '` + label + `','` + labelFull + `',` + strconv.Itoa(yr) + `,'` + mo + `',
			net_income, total_expenses, savings, saving_rate, target, ''
		FROM savings ORDER BY yr DESC, ` + moOrderSQL + ` DESC LIMIT 1`,

		// asset_entries: copy all rows from latest month if current month absent
		`INSERT OR IGNORE INTO asset_entries (date, name, category, amount, note)
		SELECT '` + labelDate + `', name, category, amount, note
		FROM asset_entries
		WHERE date = (
			SELECT date FROM asset_entries ORDER BY ` + dateSortSQL + ` DESC LIMIT 1
		)`,

		// debt_entries: copy all rows from latest month if current month absent
		`INSERT OR IGNORE INTO debt_entries (date, name, category, amount, currency, note)
		SELECT '` + labelDate + `', name, category, amount, currency, note
		FROM debt_entries
		WHERE date = (
			SELECT date FROM debt_entries ORDER BY ` + dateSortSQL + ` DESC LIMIT 1
		)`,
	}

	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("init month: %w", err)
		}
	}
	return nil
}
