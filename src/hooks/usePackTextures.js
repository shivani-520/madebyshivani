import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PACK_FRONT_TEXTURE } from "../constants/pack";

export default function usePackTextures() {
    const { gl } = useThree();
    const [assets, setAssets] = useState({ textures: null, error: null });

    useEffect(() => {
        let active = true;
        const loader = new THREE.TextureLoader();
        const pending = [];
        setAssets({ textures: null, error: null });

        const load = (url) => new Promise((resolve, reject) => {
            const texture = loader.load(url, (result) => {
                if (!active) {
                    result.dispose();
                    resolve(result);
                    return;
                }

                try {
                    result.colorSpace = THREE.SRGBColorSpace;
                    result.wrapS = result.wrapT = THREE.ClampToEdgeWrapping;
                    result.minFilter = THREE.LinearMipmapLinearFilter;
                    result.magFilter = THREE.LinearFilter;
                    result.generateMipmaps = true;
                    result.anisotropy = gl.capabilities.getMaxAnisotropy();
                    result.flipY = true;
                    result.offset.set(0, 0);
                    result.repeat.set(1, 1);
                    result.needsUpdate = true;

                    gl.initTexture(result);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }, undefined, () => reject(new Error(`Could not load ${url}`)));

            pending.push(texture);
        });

        load(PACK_FRONT_TEXTURE).then((front) => {
            if (active) {
                setAssets({ textures: { front }, error: null });
            }
        }).catch((error) => {
            if (active) {
                setAssets({ textures: null, error: error.message });
            }
        });

        return () => {
            active = false;
            pending.forEach((texture) => texture.dispose());
        };
    }, [gl]);

    return assets;
}