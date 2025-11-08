-- Create 5 groups with specific member assignments
DO $$
DECLARE
  directors_group_id uuid;
  exec_directors_group_id uuid;
  admin_group_id uuid;
  spo_group_id uuid;
  po_group_id uuid;
  user_ids uuid[];
  user_id uuid;
  idx int := 1;
BEGIN
  -- Create groups
  INSERT INTO groups (name, description, created_at, updated_at)
  VALUES 
    ('Directors', 'Director level staff members', now(), now())
  RETURNING id INTO directors_group_id;
  
  INSERT INTO groups (name, description, created_at, updated_at)
  VALUES 
    ('Executive Directors', 'Executive director level staff members', now(), now())
  RETURNING id INTO exec_directors_group_id;
  
  INSERT INTO groups (name, description, created_at, updated_at)
  VALUES 
    ('Admin', 'Administrative staff members', now(), now())
  RETURNING id INTO admin_group_id;
  
  INSERT INTO groups (name, description, created_at, updated_at)
  VALUES 
    ('SPO', 'Senior Probation Officer staff members', now(), now())
  RETURNING id INTO spo_group_id;
  
  INSERT INTO groups (name, description, created_at, updated_at)
  VALUES 
    ('PO', 'Probation Officer staff members', now(), now())
  RETURNING id INTO po_group_id;
END $$;