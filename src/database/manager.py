from sqlalchemy import create_engine

class DatabaseManager:
    def __init__(self, db_config: dict = None):
        if not db_config:
            raise ValueError("[E] - db_config is required to instantiate the Manager.")
        
        self._db_config = db_config
        self._engine = self._create_engine_instance()

        
    def _create_engine_instance(self):
        try:
            db_name  = self._db_config['DATABASE']  
            db_user  = self._db_config['USER']
            db_pass  = self._db_config['PASSWORD']
            db_host  = self._db_config['HOST']
            db_port  = self._db_config['PORT']

            uri = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}" 
            return create_engine(uri, pool_size=10, max_overflow=20)
        
        except Exception as e:
            print(f"[E] - Error creating SQLAlchemy engine: {str(e)}")
            raise


    def get_engine(self):
        return self._engine
    

    def get_transactional_connection(self):
        return self._engine.begin()
    
    
    def dispose_engine(self):
        if self._engine:
            try:
                self._engine.dispose()
                self._engine = None 
            except Exception as e:
                print(f"[E] - Error disposing SQLAlchemy engine: {str(e)}")
                raise
        else:
            print(f"[W] - SQLAlchemy engine is not active or already disposed.")