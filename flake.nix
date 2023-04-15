{
  inputs = {
    nixpkgs.url = "nixpkgs/nixos-unstable";
    utils.url = "github:numtide/flake-utils";

    # Explicitly pulling from that version of nixpkgs to avoid font duplication.
    iosevka.url = "github:Xe/iosevka";

    typst.url = "github:typst/typst";
    typst.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, utils, typst, iosevka }:
    utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ typst.overlays.default ];
        };
        typstWithIosevka = let
          fontsConf = pkgs.symlinkJoin {
            name = "typst-fonts";
            paths =
              [ "${self.packages.${system}.iosevka}" ];
          };
        in pkgs.writeShellApplication {
          name = "typst";
          text = ''
            ${pkgs.typst-dev}/bin/typst \
            --font-path ${fontsConf} \
            "$@"
          '';
          runtimeInputs = [ ];
        };
      in {
        packages.iosevka = pkgs.stdenvNoCC.mkDerivation {
          name = "iosevka-iaso-ttf";
          buildInputs = with pkgs; [ unzip ];
          dontUnpack = true;
          buildPhase = ''
            unzip ${self.inputs.iosevka.packages.${system}.default}/ttf.zip
          '';
          installPhase = ''
            mkdir -p $out
            cp ttf/* $out
          '';
        };
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [ nodejs-18_x pandoc typstWithIosevka calibre ];
          shellHook = ''
            export PATH="$PATH":$(pwd)/node_modules/.bin
          '';
        };
      });
}
