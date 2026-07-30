# Stories in sWadya

Palco narrativo 16:9 per raccontare o cantare storie in diretta, disegnando asset direttamente nella scena, muovendo personaggi e gestendo loop musicali sincronizzati mentre registri.

Non usa framework e non scarica dipendenze. Serve soltanto **Node.js LTS**.

## Avvio rapido su Windows

1. Estrai lo ZIP.
2. Installa Node.js LTS se non è già presente.
3. Fai doppio clic su **start-dev.bat**.
4. Apri `http://localhost:4173` se il browser non si apre da solo.

Da PowerShell o Prompt dei comandi:

```bat
cd C:\percorso\stories-in-swadya
npm run dev
```

Non serve eseguire `npm install`.

## Build web

Fai doppio clic su **build.bat**, oppure:

```bat
cd C:\percorso\stories-in-swadya
npm run build
```

La versione pubblicabile viene creata in `dist\`.

Per provarla:

```bat
npm run preview
```

oppure usa **preview-build.bat** e apri `http://localhost:4174`.

Il contenuto di `dist\` può essere caricato su GitHub Pages, Cloudflare Pages, Netlify, Render Static Site o un normale hosting statico. Non serve un backend.

## Nuovo progetto

Il pulsante **Nuovo** permette di creare:

- un progetto completamente vuoto, senza alcun asset in libreria;
- la demo “Armatura di drago”, con gli asset dimostrativi già disponibili.

Creare un progetto vuoto azzera scene, libreria asset e musica del progetto corrente. Esporta prima il progetto o la sola libreria asset quando vuoi conservarli.

## Sezioni della libreria

La libreria usa un menu a tendina sempre visibile:

- Persone
- Creature
- Luoghi
- Oggetti
- Effetti
- Altro

Scegli prima la sezione, poi premi **＋**. Il nuovo asset viene salvato automaticamente nella sezione scelta. La sezione può comunque essere cambiata dalla barra di creazione prima della conferma.

## Disegnare un asset direttamente nella scena

1. Seleziona la sezione della libreria.
2. Premi **＋**.
3. Disegna direttamente sul palco, sopra la scena corrente.
4. Assegna il nome.
5. Premi **Conferma asset**.

Durante la creazione:

- tasto sinistro: disegna;
- tasto destro: cancella;
- tasto centrale: sposta insieme tutto il disegno;
- **Penna**: disegno normale;
- **Gomma**: cancellazione continua;
- **Sposta**: il tasto sinistro muove insieme tutto il disegno;
- `Ctrl + Z` / `Ctrl + Y`: annulla o ripeti i tratti;
- `Esc`: annulla la creazione;
- `Ctrl + Invio`: conferma.

Alla conferma, l’asset:

- viene salvato nella sezione selezionata;
- rimane nella posizione e nelle dimensioni con cui è stato disegnato;
- viene inserito subito nella scena corrente;
- può essere trascinato nuovamente dalla libreria in altre scene;
- può essere riaperto con la matita e modificato direttamente sul palco;
- aggiorna automaticamente tutte le copie già presenti nelle scene.

Il comando **Importa immagine** rimane disponibile per PNG, JPG, WEBP e SVG, ma non è necessario per creare gli asset normali.

## Esportare e importare solo gli asset

Nell’intestazione della libreria:

- **↓** esporta tutti gli asset personalizzati in un file `.swadya-assets.json`;
- **↑** importa una libreria asset esportata in precedenza.

Questo file è separato dal progetto e serve per riutilizzare persone, oggetti, luoghi ed effetti in storie diverse senza portarsi dietro scene e musica.

## Gestione musica e loop

Apri la scheda **Musica**.

1. Imposta il BPM del progetto.
2. Premi **Aggiungi loop** e scegli uno o più file audio.
3. Per ogni loop imposta BPM originale, numero di battute e volume.
4. Premi **Avvia**.

Tutti i loop usano lo stesso trasporto musicale. Quando muti un loop, il volume va a zero ma il file continua a scorrere: riattivandolo rientra nello stesso punto e resta sincronizzato con gli altri.

Sono inclusi play, pausa, stop, BPM globale, adattamento della velocità, volume e mute per traccia e master. I file audio vengono incorporati nel progetto esportato.

## Uso con OBS

1. Avvia Stories in sWadya.
2. Premi **Output OBS**.
3. In OBS aggiungi **Cattura finestra** e scegli `Stories in sWadya — Output`.
4. Per la musica aggiungi **Cattura audio applicazione** e seleziona il browser.
5. Imposta la tela OBS a 1920×1080 o 1600×900.

La finestra Output mostra soltanto il palco: niente pannelli, selezioni o controlli.

## Comandi rapidi generali

| Comando | Azione |
|---|---|
| `1` | Seleziona l’eroe della demo |
| `2` | Seleziona la folla della demo |
| `3` | Seleziona il drago della demo |
| `D` | Mostra o nasconde il drago |
| `T` | Toglie o rimette il tetto |
| `F` | Mostra o nasconde fuoco e fumo |
| `M` | Muta o riattiva il master senza fermare il trasporto |
| `Spazio` | Scena successiva |
| `Shift + Spazio` | Scena precedente |
| `V` | Selezione |
| `B` | Disegno libero sul palco |
| `P` | Presentazione pulita |
| `Ctrl + G` | Raggruppa selezione |
| `Ctrl + Shift + G` | Separa gruppo |
| `Ctrl + D` | Duplica selezione |
| `Ctrl + Z / Ctrl + Y` | Annulla / ripeti |
| `Canc` | Elimina selezione |
| Frecce | Sposta di 1 px |
| `Shift + Frecce` | Sposta di 10 px |

## Funzioni incluse

- palco 16:9 da 1600×900;
- progetto vuoto realmente privo di asset;
- demo separata con asset dimostrativi;
- asset disegnati direttamente nella scena;
- modifica degli asset sul palco;
- categorie Persone, Creature, Luoghi, Oggetti, Effetti e Altro;
- export/import separato della libreria asset;
- gomma col tasto destro e spostamento col tasto centrale;
- trascinamento degli asset dalla libreria al palco;
- importazione facoltativa di immagini trasparenti;
- selezione singola e multipla;
- gruppi persistenti;
- spostamento, ridimensionamento, rotazione e specchio;
- livelli, blocco, visibilità e ordine;
- disegno libero sul palco;
- testi e fumetti;
- scene multiple;
- mixer di loop sincronizzati al BPM;
- mute che mantiene il tempo;
- griglia e area sicura;
- autosalvataggio nel browser;
- esportazione e importazione progetto con asset e audio;
- esportazione scena in PNG e SVG;
- finestra pulita per OBS.
# swadyaStories
