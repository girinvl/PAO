from database import engine


def ensure_columns():
    with engine.connect() as conn:
        existing = conn.exec_driver_sql("PRAGMA table_info(bodies)").fetchall()
        names = [row[1] for row in existing]

        def add(name, ddl):
            if name not in names:
                conn.exec_driver_sql(ddl)

        add("arrived_at", "ALTER TABLE bodies ADD COLUMN arrived_at DATETIME")
        if "arrived_at" not in names:
            conn.exec_driver_sql("UPDATE bodies SET arrived_at = CURRENT_TIMESTAMP WHERE arrived_at IS NULL")

        add("issued_at", "ALTER TABLE bodies ADD COLUMN issued_at DATETIME")
        add("comment", "ALTER TABLE bodies ADD COLUMN comment TEXT DEFAULT ''")

        add("flag_marshmallow", "ALTER TABLE bodies ADD COLUMN flag_marshmallow INTEGER DEFAULT 0")
        add("flag_blue_face", "ALTER TABLE bodies ADD COLUMN flag_blue_face INTEGER DEFAULT 0")
        add("flag_crooked_leg", "ALTER TABLE bodies ADD COLUMN flag_crooked_leg INTEGER DEFAULT 0")
        add("flag_vegetation", "ALTER TABLE bodies ADD COLUMN flag_vegetation INTEGER DEFAULT 0")
        add("flag_defects", "ALTER TABLE bodies ADD COLUMN flag_defects INTEGER DEFAULT 0")

        add("issue_planned_at", "ALTER TABLE bodies ADD COLUMN issue_planned_at DATETIME")
        add("issue_clothes", "ALTER TABLE bodies ADD COLUMN issue_clothes INTEGER DEFAULT 0")
        add("issue_shave_clean", "ALTER TABLE bodies ADD COLUMN issue_shave_clean INTEGER DEFAULT 0")
        add("issue_beard", "ALTER TABLE bodies ADD COLUMN issue_beard INTEGER DEFAULT 0")
        add("issue_beautify", "ALTER TABLE bodies ADD COLUMN issue_beautify INTEGER DEFAULT 0")
        add("issue_mustache", "ALTER TABLE bodies ADD COLUMN issue_mustache INTEGER DEFAULT 0")
        add("issue_funeral", "ALTER TABLE bodies ADD COLUMN issue_funeral INTEGER DEFAULT 0")
        add("issue_note", "ALTER TABLE bodies ADD COLUMN issue_note TEXT DEFAULT ''")
        add("issue_reject", "ALTER TABLE bodies ADD COLUMN issue_reject INTEGER DEFAULT 0")

        conn.commit()
