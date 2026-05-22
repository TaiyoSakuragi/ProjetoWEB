from abc import ABC, abstractmethod


class IController(ABC):

    @abstractmethod
    def index(self):
        ...

    @abstractmethod
    def show(self, id: int):
        ...

    @abstractmethod
    def store(self):
        ...

    @abstractmethod
    def update(self, id: int):
        ...

    @abstractmethod
    def destroy(self, id: int):
        ...
