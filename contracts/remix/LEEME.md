# Archivo único para Remix

`NereumSeedRound_plano.sol` es el mismo contrato de `../src/NereumSeedRound.sol`
con las dependencias de OpenZeppelin incrustadas, para que Remix no tenga que
resolver ningún import. **La lógica no cambia ni una línea.**

Comprobado: compila con **0 errores y 0 avisos**, y produce **exactamente el
mismo bytecode** que el proyecto de Hardhat — 12 397 bytes, idénticos salvo los
últimos 53, que son la huella de los nombres de archivo y no ejecutan nada.

Si se toca `../src/NereumSeedRound.sol`, hay que regenerarlo:

```
npx hardhat flatten src/NereumSeedRound.sol > remix/NereumSeedRound_plano.sol
```

y volver a dejar una sola línea de licencia y una sola de `pragma`.

## Al compilar en Remix

Estos tres ajustes no son opcionales: con otros valores el bytecode cambia y la
verificación en Etherscan o BscScan falla.

| | |
|---|---|
| Compilador | `0.8.24` |
| Optimización | activada, `200` runs |
| EVM version | `paris` |

El contrato a desplegar es **`NereumSeedRound`**, el último del archivo.
