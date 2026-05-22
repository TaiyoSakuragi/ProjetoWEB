from abc import ABC, abstractmethod


class IService(ABC):

    @abstractmethod
    def get_all(self):
        ...

    @abstractmethod
    def get_by_id(self, id: int):
        ...

    @abstractmethod
    def create(self, data: dict):
        ...

    @abstractmethod
    def update(self, id: int, data: dict):
        ...

    @abstractmethod
    def delete(self, id: int):
        ...
