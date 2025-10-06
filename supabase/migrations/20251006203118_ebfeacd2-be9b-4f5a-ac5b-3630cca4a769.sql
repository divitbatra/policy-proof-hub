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
  
  -- Get all user IDs (excluding admin user)
  SELECT array_agg(id ORDER BY created_at) INTO user_ids 
  FROM profiles 
  WHERE email != 'divitbatra1102@gmail.com';
  
  -- Assign users to Directors (15 users)
  FOR i IN 1..15 LOOP
    IF idx <= array_length(user_ids, 1) THEN
      INSERT INTO group_members (group_id, user_id, created_at)
      VALUES (directors_group_id, user_ids[idx], now())
      ON CONFLICT DO NOTHING;
      idx := idx + 1;
    END IF;
  END LOOP;
  
  -- Assign users to Executive Directors (5 users)
  FOR i IN 1..5 LOOP
    IF idx <= array_length(user_ids, 1) THEN
      INSERT INTO group_members (group_id, user_id, created_at)
      VALUES (exec_directors_group_id, user_ids[idx], now())
      ON CONFLICT DO NOTHING;
      idx := idx + 1;
    END IF;
  END LOOP;
  
  -- Assign users to Admin (20 users)
  FOR i IN 1..20 LOOP
    IF idx <= array_length(user_ids, 1) THEN
      INSERT INTO group_members (group_id, user_id, created_at)
      VALUES (admin_group_id, user_ids[idx], now())
      ON CONFLICT DO NOTHING;
      idx := idx + 1;
    END IF;
  END LOOP;
  
  -- Assign users to SPO (50 users)
  FOR i IN 1..50 LOOP
    IF idx <= array_length(user_ids, 1) THEN
      INSERT INTO group_members (group_id, user_id, created_at)
      VALUES (spo_group_id, user_ids[idx], now())
      ON CONFLICT DO NOTHING;
      idx := idx + 1;
    END IF;
  END LOOP;
  
  -- Assign users to PO (250 users)
  FOR i IN 1..250 LOOP
    IF idx <= array_length(user_ids, 1) THEN
      INSERT INTO group_members (group_id, user_id, created_at)
      VALUES (po_group_id, user_ids[idx], now())
      ON CONFLICT DO NOTHING;
      idx := idx + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Created 5 groups and assigned % users total', idx - 1;
END $$;