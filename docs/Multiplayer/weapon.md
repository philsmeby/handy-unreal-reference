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

## Replicating the Weapon Fire

Here we are not replicating variables, but we are replicating functions.

`SWeapon.h`
```c++
protected:
	// Game Code

	// Add a function for the server to handle the weapon firing
	UFUNCTION(Server, Reliable, WithValidation)
	void ServerFire();
```

The server `UFUNCTION(Server, ...)` means that the action will not occur on the clients, but it will push it to the server.

Reliable `UFUNCTION(..., Reliable, ...)` means that the action is guaranteed to get to the server.  Unreliable means its not guaranteed, and for gameplay critical actions we need to use `Reliable`.

`SWeapon.cpp`
```c++
// Convention for server functions is to prefix function name with Server
// They also require an underscore Implementation "_Implementation"
void ASWeapon::ServerFire_Implemenation()
{
}

// WithValidation requires a validation function to be added
bool ASWeapon::ServerFire_Validate()
{
	// This is intended to be an anti-cheat check!
	// It is a way to disconnect cheaters from the server
}
```

### Update Fire Function to use Replicated property

We need to execute the Fire function on the server.

`SWeapon.cpp`
```c++
void ASWeapon::Fire()
{
	if (!HasAuthority())
	{
		ServerFire();
		return;
	}

	// Game Code below
}


void ASWeapon::ServerFire_Implementation()
{
	Fire();
}
```

This change allows you to see the clients shooting on the server, but you will still not see the shooting on the clients.

Remove the `return;` statement from ASWeapon::Fire() function

```c++
	if (!HasAuthority())
	{
		ServerFire();
	}
```

**NOTE:** Damage should only be applied on the server side.  We don't want the clients to be able to set damage.

### Replication Weapon Trace between clients

Make a new struct

`SWeapon.h`
```c++
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "SWeapon.h"

class USkeletalMeshComponent;
class UDamageType;
class UparticleSystem;

// New code here.  Make a struct to contain the information of a single line trace
USTRUCT()
struct FHitScanTrace
{
	GENERATED_BODY()

public:

	// To replicate an enum to a client we have to convert it to bytes
	UPROPERTY()
	TEnumAsByte<EPhysicalSurface> SurfaceType;

	UPROPERTY()
	FVector_NetQuantize TraceTo;
};


// SWeapon.h code below

:protected

// Replicated each time the OnRep_HitScanTrace function is called
UPROPERTY(ReplicatedUsing=OnRep_HitScanTrace)
FHitScanTrace HitScanTrace;

UFUNCTION()
void OnRep_HitScanTrace();
```

Create the OnRep_HitScanTrace function

`SWeapon.cpp`
```c++
// New Include
#include "Net/UnrealNetwork.h"

void ASWeapon::OnRep_HitScanTrace()
{
	// Play weapon FX
	PlayFireEffects(HitScanTrace.TraceTo);
}

// Add the function call to the fire function

void ASWeapon::Fire()
{
	// Game code below

	if (DebugWeaponDrawing > 0)
	{
		DrawDebugLine(GetWorld(), EyeLocation, TraceEnd, FColor::White, false, 1.0f, 0, 1.0f);
	}

	PlayeFireEffects(TracerEndpoint);

	// New Code here:
	if (HasAuthority())
	{
		HitScanTrace.TraceTo = TracerEndpoint;
	}
}

void ASWeapon::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);

	// Replicate to everyone with Conditions because we dont need to send this to the owner
	DOREPLIFETIME_CONDITION(ASWeapon, HitScanTrace, COND_SkipOwner);
}
```

*NOTE:* Still don't see the the impact effect
*NOTE2:* Multiple shots in the same location are not replicated because the server thinks the client already has the information

### Finish Impact Replication

Move the Impact particle effect into a function so we can call it from the server.

`SWeapon.h`
```c++
:protected
	void PlayImpactEffects(EPhysicalSurface SurfaceType, FVector ImpactPoint);
```

`SWeapon.cpp`
```c++

// New Function code
void ASWeapon::PlayImpactEffects(EPhysicalSurface SurfaceType, FVector ImpactPoint)
{
	UParticleSystem* SelectedEffect = nullptr;
	switch (SurfaceType)
	{
		case SURFACE_FLESHDEFAULT:
		case SURFACE_FLESHVULNERABLE:
			SelectedEffect = FleshImpactEffect;
			break;
		default:
			SelectedEffect = DefaultImpactEffect;
			break;
	}

	if (SelectedEffect)
	{
		FVector MuzzleLocation = MeshComp->GetSocketLocation(MuzzleSocketName);
		FVector ShotDirection = ImpactPoint - MuzzleLocation;
		ShotDirection.Normalize();

		UGameplayStatics::SpawnEmitterAtLocation(GetWorld(), SelectedEffect, ImpactPoint, ShotDirection.Rotation());
	}
}
```

Swap the code out in the fire function to use the PlayImpactEffects function we just created.

`SWeapon.cpp`
```c++
void ASWeapon::Fire()
{
	// Game code below

	UGameplayStatics::ApplyPointDamage(HitActor, ActualDamage, ShotDirection, Hit, MyOwner->GetInstigatorController(), this, DamageType);

	// New code here:
	PlayImpactEffects(SurfaceType, Hit.ImpactPoint);
}

// Add to the OnRep_HitScanTrace function
void ASWeapon::OnRep_HitScanTrace()
{
	PlayFireEffects(HitScanTrace.TraceTo);
	PlayFireEffects(HitscanTrace.SurfaceType, HitScanTrace.TraceTo);
}
```

### Replicate Surface Type

`SWeapon.cpp`
```c++
void ASWeapon::Fire()
{
	// Set the default surface type, overwrite it only if we hit something
	FVector TracerEndPoint = TraceEnd;
	// New code:
	EPhysicalSurface SurfaceType = SurfaceType_Default;
	// ... More game code below ...


	// New Code here:
	if (HasAuthority())
	{
		HitScanTrace.TraceTo = TracerEndpoint;
		HitScanTrace.SurfaceType = SurfaceType;
	}

}
```

### Set Network Tick Rate

Bypass Unreal's dynamic network tick rate.

`SWeapon.cpp`
```c++
ASWeapon::ASWeapon()
{
 // Set at the bottom of the constructor
 NetUpdateFrequency = 66.0f;     // 100.f is the default
 MinNetUpdateFrequency = 33.0f;  // 2.0 is the default
}
```

*NOTE:* Doublecheck the blueprint `Replication` settings for Net Update Frequency and Min Net Update Frequency, as that will show if the settings are properly applied to the weapon.

**BP_Rifle**