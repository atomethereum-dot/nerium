# Archivo único para Remix

`NereumSeedRound_plano.sol` es el mismo contrato de `../src/NereumSeedRound.sol`
con las dependencias de OpenZeppelin incrustadas, para que Remix no tenga que
resolver ningún import. **La lógica no cambia ni una línea.** Va sin
comentarios, igual que el contrato: es el código que se publica al verificar.

Comprobado: compila con **0 errores y 0 avisos**, y produce **exactamente el
mismo bytecode** que el proyecto de Hardhat (13 784 bytes), salvo la huella de
metadatos del final, que no ejecuta nada.

Si se toca `../src/NereumSeedRound.sol`, se regenera con:

```
npx hardhat run scripts/plano.js
```

## Al compilar en Remix

Estos tres ajustes no son opcionales: con otros valores el bytecode cambia y la
verificación en Etherscan o BscScan falla.

| | |
|---|---|
| Compilador | `0.8.24` |
| Optimización | activada, `200` runs |
| EVM version | `paris` |

El contrato a desplegar es **`NereumSeedRound`**, el último del archivo.
