USE report_omset;

INSERT INTO categories (olsera_group_id, category_name, production_area, item_type)
VALUES
  ('4612994', 'Signature', 'Bar', 'Minuman')
ON DUPLICATE KEY UPDATE
  category_name = VALUES(category_name),
  production_area = VALUES(production_area),
  item_type = VALUES(item_type);

INSERT INTO billiard_cashiers (cashier_name)
VALUES
  ('Otniel')
ON DUPLICATE KEY UPDATE
  cashier_name = VALUES(cashier_name);
