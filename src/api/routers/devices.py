"""
Sensor device management API endpoints.
Handles user-connected air quality sensor devices.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from src.api.database import get_db
from src.api.auth import get_current_user
from src.api.models import User, SensorDevice
from src.api.schemas import SensorDeviceRequest, SensorDeviceResponse, LocationPoint

router = APIRouter()


@router.get("", response_model=List[SensorDeviceResponse])
async def get_user_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    active_only: bool = Query(True, description="Return only active devices")
):
    """
    Get all sensor devices for the authenticated user.
    
    - **active_only**: Filter to return only active devices
    """
    query = db.query(SensorDevice).filter(SensorDevice.user_id == current_user.id)
    
    if active_only:
        query = query.filter(SensorDevice.is_active == True)
    
    devices = query.order_by(SensorDevice.created_at.desc()).all()
    
    response_devices = []
    for device in devices:
        # Extract coordinates from PostGIS geometry if present
        location_point = None
        if device.location:
            location_wkt = str(device.location)
            if "POINT(" in location_wkt:
                coords_str = location_wkt.replace("POINT(", "").replace(")", "")
                lon, lat = map(float, coords_str.split())
                location_point = LocationPoint(latitude=lat, longitude=lon)
        
        response_devices.append(SensorDeviceResponse(
            id=device.id,
            device_name=device.device_name,
            device_id=device.device_id,
            location=location_point,
            location_name=device.location_name,
            status=device.status,
            battery_level=device.battery_level,
            last_reading_at=device.last_reading_at,
            last_reading_aqi=device.last_reading_aqi,
            device_type=device.device_type,
            firmware_version=device.firmware_version,
            is_active=device.is_active,
            created_at=device.created_at,
            updated_at=device.updated_at
        ))
    
    return response_devices


@router.post("", response_model=SensorDeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(
    device_request: SensorDeviceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new sensor device for the authenticated user.
    
    - **device_name**: Human-readable name for the device
    - **device_id**: Optional external device identifier
    - **location**: Optional geographic coordinates
    - **location_name**: Optional human-readable location name
    - **device_type**: Optional device model/type
    - **firmware_version**: Optional firmware version
    """
    # Check if device_id already exists (if provided)
    if device_request.device_id:
        existing_device = db.query(SensorDevice).filter(
            SensorDevice.device_id == device_request.device_id
        ).first()
        
        if existing_device:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Device with ID '{device_request.device_id}' already exists"
            )
    
    # Create location WKT if coordinates provided
    location_wkt = None
    if device_request.location:
        location_wkt = f"POINT({device_request.location.longitude} {device_request.location.latitude})"
    
    # Create new device
    new_device = SensorDevice(
        user_id=current_user.id,
        device_name=device_request.device_name,
        device_id=device_request.device_id,
        location=location_wkt,
        location_name=device_request.location_name,
        device_type=device_request.device_type,
        firmware_version=device_request.firmware_version,
        status="connected",
        is_active=True
    )
    
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    
    return SensorDeviceResponse(
        id=new_device.id,
        device_name=new_device.device_name,
        device_id=new_device.device_id,
        location=device_request.location,
        location_name=new_device.location_name,
        status=new_device.status,
        battery_level=new_device.battery_level,
        last_reading_at=new_device.last_reading_at,
        last_reading_aqi=new_device.last_reading_aqi,
        device_type=new_device.device_type,
        firmware_version=new_device.firmware_version,
        is_active=new_device.is_active,
        created_at=new_device.created_at,
        updated_at=new_device.updated_at
    )


@router.get("/{device_id}", response_model=SensorDeviceResponse)
async def get_device(
    device_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific sensor device by ID.
    
    - **device_id**: UUID of the device to retrieve
    """
    device = db.query(SensorDevice).filter(
        and_(
            SensorDevice.id == device_id,
            SensorDevice.user_id == current_user.id
        )
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    # Extract coordinates from PostGIS geometry if present
    location_point = None
    if device.location:
        location_wkt = str(device.location)
        if "POINT(" in location_wkt:
            coords_str = location_wkt.replace("POINT(", "").replace(")", "")
            lon, lat = map(float, coords_str.split())
            location_point = LocationPoint(latitude=lat, longitude=lon)
    
    return SensorDeviceResponse(
        id=device.id,
        device_name=device.device_name,
        device_id=device.device_id,
        location=location_point,
        location_name=device.location_name,
        status=device.status,
        battery_level=device.battery_level,
        last_reading_at=device.last_reading_at,
        last_reading_aqi=device.last_reading_aqi,
        device_type=device.device_type,
        firmware_version=device.firmware_version,
        is_active=device.is_active,
        created_at=device.created_at,
        updated_at=device.updated_at
    )


@router.put("/{device_id}", response_model=SensorDeviceResponse)
async def update_device(
    device_id: UUID,
    device_request: SensorDeviceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing sensor device.
    
    - **device_id**: UUID of the device to update
    - **device_name**: New device name
    - **device_id**: New external device identifier
    - **location**: New geographic coordinates
    - **location_name**: New location name
    - **device_type**: New device type
    - **firmware_version**: New firmware version
    """
    device = db.query(SensorDevice).filter(
        and_(
            SensorDevice.id == device_id,
            SensorDevice.user_id == current_user.id
        )
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    # Check if new device_id conflicts with existing device
    if device_request.device_id and device_request.device_id != device.device_id:
        existing_device = db.query(SensorDevice).filter(
            SensorDevice.device_id == device_request.device_id
        ).first()
        
        if existing_device:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Device with ID '{device_request.device_id}' already exists"
            )
    
    # Update device fields
    device.device_name = device_request.device_name
    device.device_id = device_request.device_id
    device.location_name = device_request.location_name
    device.device_type = device_request.device_type
    device.firmware_version = device_request.firmware_version
    
    # Update location if provided
    if device_request.location:
        location_wkt = f"POINT({device_request.location.longitude} {device_request.location.latitude})"
        device.location = location_wkt
    
    device.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(device)
    
    return SensorDeviceResponse(
        id=device.id,
        device_name=device.device_name,
        device_id=device.device_id,
        location=device_request.location,
        location_name=device.location_name,
        status=device.status,
        battery_level=device.battery_level,
        last_reading_at=device.last_reading_at,
        last_reading_aqi=device.last_reading_aqi,
        device_type=device.device_type,
        firmware_version=device.firmware_version,
        is_active=device.is_active,
        created_at=device.created_at,
        updated_at=device.updated_at
    )


@router.delete("/{device_id}")
async def delete_device(
    device_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a sensor device.
    
    - **device_id**: UUID of the device to delete
    """
    device = db.query(SensorDevice).filter(
        and_(
            SensorDevice.id == device_id,
            SensorDevice.user_id == current_user.id
        )
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    db.delete(device)
    db.commit()
    
    return {
        "device_id": device_id,
        "message": "Device deleted successfully"
    }


@router.patch("/{device_id}/status")
async def update_device_status(
    device_id: UUID,
    status: str = Query(..., pattern="^(connected|disconnected|low_battery)$"),
    battery_level: Optional[int] = Query(None, ge=0, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update device status and battery level.
    
    - **device_id**: UUID of the device
    - **status**: New status (connected, disconnected, low_battery)
    - **battery_level**: Optional battery level (0-100)
    """
    device = db.query(SensorDevice).filter(
        and_(
            SensorDevice.id == device_id,
            SensorDevice.user_id == current_user.id
        )
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    device.status = status
    if battery_level is not None:
        device.battery_level = battery_level
    device.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "device_id": device_id,
        "status": device.status,
        "battery_level": device.battery_level,
        "message": "Device status updated successfully"
    }


@router.patch("/{device_id}/reading")
async def update_device_reading(
    device_id: UUID,
    aqi_value: int = Query(..., ge=0, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update device's last reading data.
    
    - **device_id**: UUID of the device
    - **aqi_value**: Latest AQI reading (0-500)
    """
    device = db.query(SensorDevice).filter(
        and_(
            SensorDevice.id == device_id,
            SensorDevice.user_id == current_user.id
        )
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    device.last_reading_aqi = aqi_value
    device.last_reading_at = datetime.utcnow()
    device.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "device_id": device_id,
        "last_reading_aqi": device.last_reading_aqi,
        "last_reading_at": device.last_reading_at,
        "message": "Device reading updated successfully"
    }


@router.patch("/{device_id}/toggle")
async def toggle_device_active(
    device_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Toggle the active status of a device.
    
    - **device_id**: UUID of the device to toggle
    """
    device = db.query(SensorDevice).filter(
        and_(
            SensorDevice.id == device_id,
            SensorDevice.user_id == current_user.id
        )
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    device.is_active = not device.is_active
    device.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "device_id": device_id,
        "is_active": device.is_active,
        "message": f"Device {'activated' if device.is_active else 'deactivated'}"
    }
