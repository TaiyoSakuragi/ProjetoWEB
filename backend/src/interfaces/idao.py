from abc import ABC, abstractmethod


class IDAO(ABC):
    """Interface base para todas as classes de acesso a dados (Repository/DAO)."""

    @abstractmethod
    def find_all(self) -> list:
        """Retorna todos os registros ativos."""
        ...

    @abstractmethod
    def find_by_id(self, id: int) -> dict | None:
        """Retorna um registro pelo ID ou None se não encontrado."""
        ...

    @abstractmethod
    def save(self, data: dict) -> int:
        """Persiste um novo registro e retorna o ID gerado."""
        ...

    @abstractmethod
    def update(self, id: int, data: dict):
        """Atualiza campos de um registro existente."""
        ...

    @abstractmethod
    def deactivate(self, id: int):
        """Desativa (soft delete) um registro pelo ID."""
        ...
