import src.db_config as _cfg
from src.database.repository.users_repository   import UsersRepository


class AuthService:

    def __init__(self):
        self._repo = UsersRepository(_cfg.engine)

    def authenticate(self, email: str, password: str):
        user = self._repo.find_by_email(email)
        if user and UsersRepository.check_password(user, password):
            return user
        return None


