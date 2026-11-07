import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, ForeignKey, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    unit = Column(String(32), default="meters")  # meters, millimeters, centimeters, feet, inches
    scale = Column(Float, default=1.0)  # world units per pixel
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    source_files = relationship("SourceFile", back_populates="project", cascade="all, delete-orphan")
    floors = relationship("Floor", back_populates="project", cascade="all, delete-orphan")
    exports = relationship("ModelExport", back_populates="project", cascade="all, delete-orphan")
    jobs = relationship("ProcessingJob", back_populates="project", cascade="all, delete-orphan")

class SourceFile(Base):
    __tablename__ = "source_files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    format = Column(String(32), nullable=False)  # dxf, svg, png, jpg, pdf, dwg
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, default=0)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="source_files")

class Floor(Base):
    __tablename__ = "floors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    name = Column(String(128), default="Floor 1")
    elevation = Column(Float, default=0.0)
    wall_height = Column(Float, default=3.0)
    order_index = Column(Integer, default=0)

    project = relationship("Project", back_populates="floors")
    walls = relationship("Wall", back_populates="floor", cascade="all, delete-orphan")
    rooms = relationship("Room", back_populates="floor", cascade="all, delete-orphan")
    structural_objects = relationship("StructuralObject", back_populates="floor", cascade="all, delete-orphan")

class Wall(Base):
    __tablename__ = "walls"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    floor_id = Column(String(36), ForeignKey("floors.id"), nullable=False)
    start_x = Column(Float, nullable=False)
    start_y = Column(Float, nullable=False)
    end_x = Column(Float, nullable=False)
    end_y = Column(Float, nullable=False)
    thickness = Column(Float, default=0.20)
    height = Column(Float, default=3.0)
    wall_type = Column(String(64), default="external")  # external, internal, partition
    layer = Column(String(64), default="WALLS")
    material = Column(String(64), default="default")

    floor = relationship("Floor", back_populates="walls")
    openings = relationship("Opening", back_populates="wall", cascade="all, delete-orphan")

class Opening(Base):
    __tablename__ = "openings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    wall_id = Column(String(36), ForeignKey("walls.id"), nullable=False)
    type = Column(String(32), default="door")  # door, window
    offset = Column(Float, default=1.0)  # distance along wall from start point
    width = Column(Float, default=0.9)
    height = Column(Float, default=2.1)
    sill_height = Column(Float, default=0.0)  # 0 for door, e.g. 0.9 for window

    wall = relationship("Wall", back_populates="openings")

class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    floor_id = Column(String(36), ForeignKey("floors.id"), nullable=False)
    name = Column(String(128), default="Room")
    boundary = Column(JSON, default=list)  # list of [x, y] coordinates
    area = Column(Float, default=0.0)

    floor = relationship("Floor", back_populates="rooms")

class StructuralObject(Base):
    __tablename__ = "structural_objects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    floor_id = Column(String(36), ForeignKey("floors.id"), nullable=False)
    type = Column(String(64), default="column")  # column, beam, stair, slab
    geometry = Column(JSON, default=dict)
    properties = Column(JSON, default=dict)

    floor = relationship("Floor", back_populates="structural_objects")

class ModelExport(Base):
    __tablename__ = "model_exports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    format = Column(String(32), nullable=False)  # glb, gltf, obj, stl, dxf, json
    file_path = Column(String(512), nullable=False)
    status = Column(String(32), default="completed")  # pending, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="exports")

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    status = Column(String(32), default="queued")  # queued, processing, completed, failed
    progress = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)
    result_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="jobs")

