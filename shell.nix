# shell.nix
let
  sources = import ./nix/sources.nix;
  pkgs = import sources.nixpkgs {};
in
pkgs.mkShell {
	buildInputs = [
		pkgs.yarn
		pkgs.nodejs-14_x
	];

  # Environment variables
  # HELLO="world";
}