# Player Aiming and Shooting

### Dynamic Crosshairs

Add some variables to the player character.

*PlayerCharacter.h*
```c++
// Crosshair Spread
:private

	/* Sets the crosshair spread or distrance */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = Crosshairs, meta = (AllowPrivateAccess = "true"))
	float CrosshairSpreadMultiplier;

	// Create some variables which will be used to modify the spread multiplier
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = Crosshairs, meta = (AllowPrivateAccess = "true"))
	float CrosshairVelocityFactor;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = Crosshairs, meta = (AllowPrivateAccess = "true"))
	float CrosshairInAirFactor;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = Crosshairs, meta = (AllowPrivateAccess = "true"))
	float CrosshairAimFactor;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = Crosshairs, meta = (AllowPrivateAccess = "true"))
	float CrosshairShootingFactor;

:protected

	void CalculateCrosshairSpread(float DeltaTime);
```

*PlayerCharacter.cpp*
```c++
void APlayerCharacter::CalculateCrosshairSpread(float DeltaTime)
{
	// Velocity will be from 0 and the maximum walk speed, but we need it to be from 0 to 1
	// We need to map the range of WalkSpeedRange to the VelocityMultiplierRange
	FVector2D WalkSpeedRange{0.f, 600.f};
	FVector2D VelocityMultiplierRange{0.f, 1.f};

	CrosshairVelocityFactor = FMath::GetMappedRangeValueClamped(WalkSpeedRange, VelocityMultiplierRange, GetVelocity().Size());

	CrosshairSpreadMultiplier = 0.5f + CrosshairVelocityFactor;
}
```

## Adding Crosshair Spread to Player

Need to add this to our tick function

*PlayerCharacter.cpp*
```c++
void APlayerCharacter::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

 // TICK CODE ...

	CalculateCrosshairSpread(DeltaTime);
}
```

### Exposing to Blueprints

Making the Crosshair spread accessible and configurable from Blueprints
*PlayerCharacter.h*
```c++
:public
	UFUNCTION(BlueprintCallable, Category = Crosshairs)
	float GetCrosshairSpreadMultiplier() const;
```

*PlayerCharacter.cpp*
```c++
float APlayerCharacter::GetCrosshairSpreadMultiplier() const
{
	return CrosshairSpreadMultiplier;
}
```

### Updating the Widget

Open Unreal Engine and open the Player HUD.  We are drawing crosshairs to the screen with the `Draw Texture` component in the Event Graph.

We need to split this component into 4 parts... one for each of the arms of the crosshairs.

#### Create a new Variable

