import os
from sqlalchemy import create_engine, text

def migrate():
    # Database is in the same folder as this script, or we can use relative path
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "liquidaciones.db")
    print(f"Connecting to database at: {db_path}")
    
    if not os.path.exists(db_path):
        print("Database file not found. Skipping migration.")
        return

    engine = create_engine(f"sqlite:///{db_path}")
    
    with engine.connect() as conn:
        # Check rows with 'pendiente'
        count_query = text("SELECT COUNT(*) FROM liquidaciones WHERE estado = 'pendiente'")
        count = conn.execute(count_query).scalar()
        print(f"Found {count} liquidaciones with status 'pendiente'.")
        
        if count > 0:
            update_query = text("UPDATE liquidaciones SET estado = 'abierta' WHERE estado = 'pendiente'")
            res = conn.execute(update_query)
            conn.commit()
            print(f"Successfully migrated {res.rowcount} liquidaciones to 'abierta'.")
        else:
            print("No liquidaciones needed migration.")

if __name__ == "__main__":
    migrate()
