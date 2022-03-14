# Replicating Weapon

When you start Unreal in multiplayer mode you see the character and the weapon because the code is part of the begin play event.

We want to set this on the server, and then have Unreal replicate it to the clients.

## Setting up the character

[Cannot Access Role](https://forums.unrealengine.com/t/cant-access-role-for-multiplayer-purpose/467009)

Looks like there are two ways to get the Role value.

GetLocalRole() == ROLE_Authority
or
HasAuthority()

`SCharacter.cpp`
```c++
void ASCharacter::BeginPlay()
{
	Super::BeginPlay();

	DefaultFOV = Camera->FieldOfView;
	// Custom Components
	HealthComp->OnHealthChanged.AddDynamic(this, &ASCharacter::OnHealthChanged);

	// Check if the the instance is running as the server
	// GetLocalRole() == ROLE_Authority
	if (HasAuthority())
	{
		// Move the weapon code into this check
		// Spawn a default Weapon
		FActorSpawnParameters SpawnParams;
		SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

		CurrentWeapon = GetWorld()->SpawnActor<AWeapon>(StarterWeaponClass, FVector::ZeroVector, FRotator::ZeroRotator, SpawnParams);
		if (CurrentWeapon)
		{
			CurrentWeapon->SetOwner(this);
			CurrentWeapon->AttachToComponent(GetMesh(), FAttachmentTransformRules::SnapToTargetNotIncludingScale, WeaponAttachSocketName);
		}
	}
}
```

### Server Results

When running the game in multiplayer mode, you will see on the server both characters having a weapon, however, on the client, neither player will have a weapon because we need to replicate it to all of the clients.

## Replicating the Weapon

Update the weapon class, so that it is a replicated actor.

`SWeapon.cpp`
```c++
ASWeapon::ASWeapon()
{
	MeshComp = CreateDefaultSubobject<USkeletalMeshComponent>(TEXT("MeshComp"));
	RootComponent = MeshComp;

	MuzzleSocketName = "MuzzleSocket";
	TracerTargetName = "Target";

	BaseDamage = 20.f;
	RateOfFire = 600.f;

	// New Code here...
	SetReplicates(true);
}
```

When we spawn this weapon on a server, it will also replicate to all of the clients.  It setups an actor channel for the weapon which creates a variable on the server which is used by the clients.

**NOTE**: There is a Replication section in blueprints which needs to be checked.

[Blueprint Replicates](../media/multiplayer_weapon_1.png)

## Create Current Weapon Server Variable

We need to set CurrentWeapon as a variable on the server.  This will allow the client to use the server replicated data to invoke the fire method.

`SCharacter.h`
```c++
:protected
	// Game Code

	void BeginZoom();
	void EndZoom();

	// Added Code below
	UPROPERTY(Replicated)
	ASWeapon* CurrentWeapon;
```

### Create Replication Function

We need to specify how we are going to replicate the weapon to the clients by using a custom function.

The signature of the function is below:

`SCharacter.cpp`
```c++
// Add the include statement
#include "Net/UnrealNetwork.h"

void ASCharacter::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);

	// Default most simple implementation
	DOREPLIFETIME(ASCharacter, CurrentWeapon);
}
```