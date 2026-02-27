PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE professions (id INTEGER PRIMARY KEY, name TEXT, category_id INTEGER);
INSERT INTO professions VALUES(1,'Chaveiro',1);
COMMIT;
