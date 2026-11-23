import { useCallback, useEffect, useState } from 'react';
import { ASIGNATURAS_1ESO_CANARIAS } from '../data/curriculumCanarias';
import { isFirebaseConfigured } from '../lib/firebase';
import {
  deleteArtefacto,
  getAllArtefactos,
  updateArtefactoMiniApp,
} from '../services/artefactosService';
import {
  deleteLibretaError,
  getAllLibretaErrores,
  updateLibretaErrorEstado,
  upsertLibretaError,
} from '../services/libretaErroresService';
import {
  runIterateArtifact,
  runStep1OcrAnalysis,
  runStep2GenerateMaterials,
} from '../services/pedagogicalEngine';
import { deleteRetoPablo, getAllRetosPablo } from '../services/retosService';
import type {
  EstadoError,
  LibretaErrorDoc,
  LibretaErrorInput,
  RetoPabloHydrated,
  TipoJuego,
} from '../types/firestore';
import type { FuenteDocumento, OcrVerificationData, UploadedImageItem } from '../types/ocr';
import type {
  ArtefactoDoc,
  GamePayload,
  GeneratedStudyPack,
  NivelDificultad,
} from '../types/studyMaterial';
import { prepareImageFile } from '../utils/imageUtils';
import { ArtefactosPanel } from '../components/dashboard/ArtefactosPanel';
import { LibretaErroresPanel } from '../components/dashboard/LibretaErroresPanel';
import { RetosHistoryPanel } from '../components/dashboard/RetosHistoryPanel';
import { ConfigWarningBanner } from '../components/layout/ConfigWarningBanner';
import { TeacherLayout } from '../components/layout/TeacherLayout';
import type { TeacherSection } from '../components/layout/TeacherLayout';
import { ImageUploader } from '../components/ocr/ImageUploader';
import { OcrVerificationPanel } from '../components/ocr/OcrVerificationPanel';
import { OutputTabs } from '../components/outputs/OutputTabs';

type GeneratorStep = 'upload' | 'verify' | 'results';

export function TeacherDashboardPage() {
  const [activeSection, setActiveSection] = useState<TeacherSection>('generador');

  // Datos de Firestore
  const [artefactosItems, setArtefactosItems] = useState<ArtefactoDoc[]>([]);
  const [artefactosLoading, setArtefactosLoading] = useState(isFirebaseConfigured);
  const [artefactosError, setArtefactosError] = useState<string | null>(null);

  const [libretaItems, setLibretaItems] = useState<LibretaErrorDoc[]>([]);
  const [libretaLoading, setLibretaLoading] = useState(isFirebaseConfigured);
  const [libretaError, setLibretaError] = useState<string | null>(null);

  const [retosItems, setRetosItems] = useState<RetoPabloHydrated[]>([]);
  const [retosLoading, setRetosLoading] = useState(isFirebaseConfigured);
  const [retosError, setRetosError] = useState<string | null>(null);

  // Flujo del generador (2 pasos + iteración)
  const [step, setStep] = useState<GeneratorStep>('upload');
  const [asignatura, setAsignatura] = useState<string>(
    ASIGNATURAS_1ESO_CANARIAS[0]?.nombre ?? 'Matemáticas',
  );
  const [fuente, setFuente] = useState<FuenteDocumento>('apuntes_clase');
  const [dificultad, setDificultad] = useState<NivelDificultad>('estandar');
  const [images, setImages] = useState<UploadedImageItem[]>([]);
  const [extraPrompt, setExtraPrompt] = useState('');
  const [manualText, setManualText] = useState('');
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isAnalyzingOcr, setIsAnalyzingOcr] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [verification, setVerification] = useState<OcrVerificationData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [activeArtefacto, setActiveArtefacto] = useState<ArtefactoDoc | null>(null);
  const [studyPack, setStudyPack] = useState<GeneratedStudyPack | null>(null);
  const [injectedErrors, setInjectedErrors] = useState<LibretaErrorDoc[]>([]);
  const [savedNewErrorsCount, setSavedNewErrorsCount] = useState(0);
  const [firestoreWarning, setFirestoreWarning] = useState<string | null>(null);

  const [isIterating, setIsIterating] = useState(false);
  const [iterateError, setIterateError] = useState<string | null>(null);
  const [iterateSuccessMessage, setIterateSuccessMessage] = useState<string | null>(null);

  const loadArtefactos = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    setArtefactosLoading(true);
    setArtefactosError(null);
    try {
      const data = await getAllArtefactos();
      setArtefactosItems(data);
    } catch (error) {
      setArtefactosError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar artefactos desde Firestore.',
      );
    } finally {
      setArtefactosLoading(false);
    }
  }, []);

  const loadLibreta = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    setLibretaLoading(true);
    setLibretaError(null);
    try {
      const data = await getAllLibretaErrores();
      setLibretaItems(data);
    } catch (error) {
      setLibretaError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar libreta_errores desde Firestore.',
      );
    } finally {
      setLibretaLoading(false);
    }
  }, []);

  const loadRetos = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    setRetosLoading(true);
    setRetosError(null);
    try {
      const data = await getAllRetosPablo();
      setRetosItems(data);
    } catch (error) {
      setRetosError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar retos_pablo desde Firestore.',
      );
    } finally {
      setRetosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let cancelled = false;

    async function fetchInitialData() {
      const [artefactosRes, libretaRes, retosRes] = await Promise.allSettled([
        getAllArtefactos(),
        getAllLibretaErrores(),
        getAllRetosPablo(),
      ]);
      if (cancelled) return;

      if (artefactosRes.status === 'fulfilled') {
        setArtefactosItems(artefactosRes.value);
      } else {
        setArtefactosError(
          artefactosRes.reason instanceof Error
            ? artefactosRes.reason.message
            : 'No se pudo cargar artefactos desde Firestore.',
        );
      }
      setArtefactosLoading(false);

      if (libretaRes.status === 'fulfilled') {
        setLibretaItems(libretaRes.value);
      } else {
        setLibretaError(
          libretaRes.reason instanceof Error
            ? libretaRes.reason.message
            : 'No se pudo cargar libreta_errores desde Firestore.',
        );
      }
      setLibretaLoading(false);

      if (retosRes.status === 'fulfilled') {
        setRetosItems(retosRes.value);
      } else {
        setRetosError(
          retosRes.reason instanceof Error
            ? retosRes.reason.message
            : 'No se pudo cargar retos_pablo desde Firestore.',
        );
      }
      setRetosLoading(false);
    }

    void fetchInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingErrorsCount = libretaItems.filter(
    (item) => item.estado === 'pendiente' || item.estado === 'en_repaso',
  ).length;

  const activeSubjectErrorsCount = isFirebaseConfigured
    ? libretaItems.filter(
        (item) =>
          item.asignatura === asignatura &&
          (item.estado === 'pendiente' || item.estado === 'en_repaso'),
      ).length
    : null;

  async function handleAddImages(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploadError(null);
    setIsProcessingImages(true);
    try {
      const prepared = await Promise.all(files.map((file) => prepareImageFile(file)));
      setImages((prev) => [...prev, ...prepared]);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al procesar los archivos seleccionados.',
      );
    } finally {
      setIsProcessingImages(false);
    }
  }

  function handleRemoveImage(id: string) {
    setImages((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleAnalyzeImages() {
    setUploadError(null);
    setIsAnalyzingOcr(true);
    try {
      const result = await runStep1OcrAnalysis({
        asignatura,
        fuente,
        images,
        extraPrompt,
      });

      const mergedTranscription = manualText.trim()
        ? `${result.transcripcion}\n\n--- Texto adicional pegado ---\n${manualText.trim()}`
        : result.transcripcion;

      setVerification({
        ...result,
        transcripcion: mergedTranscription,
      });
      setGenerateError(null);
      setStep('verify');
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : 'No se pudieron analizar los archivos con Gemini Vision.',
      );
    } finally {
      setIsAnalyzingOcr(false);
    }
  }

  function handleContinueWithManualText() {
    setUploadError(null);
    setGenerateError(null);
    setVerification({
      asignatura,
      tema: 'Tema introducido manualmente',
      fuente,
      transcripcion: manualText.trim(),
      errores_detectados: [],
      observaciones_legibilidad: '',
      notas_adicionales_docente: extraPrompt.trim(),
    });
    setStep('verify');
  }

  async function handleConfirmAndGenerate() {
    if (!verification) return;
    setGenerateError(null);
    setIterateError(null);
    setIterateSuccessMessage(null);
    setIsGenerating(true);

    try {
      const outcome = await runStep2GenerateMaterials(verification, dificultad);
      setStudyPack(outcome.studyPack);
      setActiveArtefacto(outcome.artefacto);
      setInjectedErrors(outcome.injectedErrors);
      setSavedNewErrorsCount(outcome.savedNewErrorsCount);
      setFirestoreWarning(outcome.firestoreWarning);
      setStep('results');

      if (outcome.artefacto) {
        const createdArtefacto = outcome.artefacto;
        setArtefactosItems((prev) => [createdArtefacto, ...prev]);
      }

      if (isFirebaseConfigured && outcome.savedNewErrorsCount > 0) {
        void loadLibreta();
      }
    } catch (error) {
      setGenerateError(
        error instanceof Error
          ? error.message
          : 'Error al generar el paquete pedagógico con Gemini.',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleIterateArtifact(
    targetDificultad: NivelDificultad,
    instruccionCambio: string,
  ) {
    if (!studyPack || !verification) return;
    setIterateError(null);
    setIterateSuccessMessage(null);
    setIsIterating(true);

    try {
      const outcome = await runIterateArtifact({
        currentPack: studyPack,
        verification,
        artefacto: activeArtefacto,
        targetDificultad,
        instruccionCambio,
      });

      setStudyPack(outcome.nextStudyPack);
      setDificultad(targetDificultad);
      setInjectedErrors(outcome.injectedErrors);
      if (outcome.firestoreWarning) {
        setFirestoreWarning(outcome.firestoreWarning);
      }

      if (outcome.nextArtefacto) {
        const updated = outcome.nextArtefacto;
        setActiveArtefacto(updated);
        setArtefactosItems((prev) => {
          const rest = prev.filter((item) => item.id !== updated.id);
          return [updated, ...rest];
        });
        setIterateSuccessMessage(
          `Artefacto actualizado a la versión v${updated.version}.${
            outcome.syncedSesion
              ? ' El enlace /sesion/:id de Pablo también se actualizó automáticamente.'
              : ''
          }`,
        );
      } else {
        setIterateSuccessMessage('Cambios aplicados sobre el material actual.');
      }
    } catch (error) {
      setIterateError(
        error instanceof Error
          ? error.message
          : 'No se pudo iterar sobre el artefacto con Gemini.',
      );
    } finally {
      setIsIterating(false);
    }
  }

  function handleOpenArtefacto(artefacto: ArtefactoDoc) {
    setActiveArtefacto(artefacto);
    setStudyPack(artefacto.study_pack);
    setVerification(artefacto.verification);
    setDificultad(artefacto.dificultad);
    setAsignatura(artefacto.asignatura);
    setInjectedErrors([]);
    setSavedNewErrorsCount(0);
    setFirestoreWarning(null);
    setIterateError(null);
    setIterateSuccessMessage(null);
    setStep('results');
    setActiveSection('generador');
  }

  function handleSesionAttached(sesionId: string) {
    if (!activeArtefacto) return;
    const updated: ArtefactoDoc = {
      ...activeArtefacto,
      sesion_pablo_id: sesionId,
    };
    setActiveArtefacto(updated);
    setArtefactosItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  function handleStartNewSession() {
    setStep('upload');
    setDificultad('estandar');
    setImages([]);
    setManualText('');
    setExtraPrompt('');
    setVerification(null);
    setActiveArtefacto(null);
    setStudyPack(null);
    setInjectedErrors([]);
    setSavedNewErrorsCount(0);
    setFirestoreWarning(null);
    setUploadError(null);
    setGenerateError(null);
    setIterateError(null);
    setIterateSuccessMessage(null);
  }

  function handleUpdateMiniApp(tipo: TipoJuego, nextPayload: GamePayload) {
    if (!studyPack) return;
    const nextPack: GeneratedStudyPack = {
      ...studyPack,
      mini_apps: {
        ...studyPack.mini_apps,
        [tipo]: nextPayload,
      },
    };
    setStudyPack(nextPack);

    if (isFirebaseConfigured && activeArtefacto) {
      void updateArtefactoMiniApp({
        artefacto: activeArtefacto,
        nextStudyPack: nextPack,
      }).then((updated) => {
        setActiveArtefacto(updated);
        setArtefactosItems((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
      });
    }
  }

  function handleRetoPublished(reto: RetoPabloHydrated) {
    setRetosItems((prev) => [reto, ...prev]);
  }

  async function handleChangeLibretaEstado(id: string, estado: EstadoError) {
    await updateLibretaErrorEstado(id, estado);
    setLibretaItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, estado, ultima_revision: new Date().toISOString() }
          : item,
      ),
    );
  }

  async function handleDeleteLibretaItem(id: string) {
    await deleteLibretaError(id);
    setLibretaItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleCreateManualLibreta(input: LibretaErrorInput) {
    const created = await upsertLibretaError(input);
    setLibretaItems((prev) => {
      const filtered = prev.filter((item) => item.id !== created.id);
      return [created, ...filtered];
    });
  }

  async function handleDeleteReto(id: string) {
    await deleteRetoPablo(id);
    setRetosItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleDeleteArtefacto(id: string) {
    await deleteArtefacto(id);
    setArtefactosItems((prev) => prev.filter((item) => item.id !== id));
    if (activeArtefacto?.id === id) {
      setActiveArtefacto(null);
    }
  }

  return (
    <TeacherLayout
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      artefactosCount={artefactosItems.length}
      pendingErrorsCount={pendingErrorsCount}
      retosCount={retosItems.length}
    >
      <ConfigWarningBanner />

      {activeSection === 'generador' && (
        <>
          {step === 'upload' && (
            <ImageUploader
              asignatura={asignatura}
              onAsignaturaChange={setAsignatura}
              fuente={fuente}
              onFuenteChange={setFuente}
              images={images}
              onAddImages={(files) => void handleAddImages(files)}
              onRemoveImage={handleRemoveImage}
              extraPrompt={extraPrompt}
              onExtraPromptChange={setExtraPrompt}
              manualText={manualText}
              onManualTextChange={setManualText}
              activeLibretaErrorsCount={activeSubjectErrorsCount}
              isProcessingImages={isProcessingImages}
              isAnalyzingOcr={isAnalyzingOcr}
              errorMessage={uploadError}
              onAnalyzeImages={() => void handleAnalyzeImages()}
              onContinueWithManualText={handleContinueWithManualText}
            />
          )}

          {step === 'verify' && verification && (
            <OcrVerificationPanel
              verification={verification}
              images={images}
              dificultad={dificultad}
              onDificultadChange={setDificultad}
              activeLibretaErrorsCount={
                isFirebaseConfigured
                  ? libretaItems.filter(
                      (item) =>
                        item.asignatura === verification.asignatura &&
                        (item.estado === 'pendiente' || item.estado === 'en_repaso'),
                    ).length
                  : null
              }
              isGenerating={isGenerating}
              errorMessage={generateError}
              onChange={setVerification}
              onBack={() => setStep('upload')}
              onConfirmAndGenerate={() => void handleConfirmAndGenerate()}
            />
          )}

          {step === 'results' && studyPack && verification && (
            <OutputTabs
              key={activeArtefacto?.id ?? 'local_pack'}
              studyPack={studyPack}
              verification={verification}
              artefacto={activeArtefacto}
              dificultad={dificultad}
              injectedErrors={injectedErrors}
              savedNewErrorsCount={savedNewErrorsCount}
              firestoreWarning={firestoreWarning}
              isIterating={isIterating}
              iterateError={iterateError}
              iterateSuccessMessage={iterateSuccessMessage}
              onIterateArtifact={handleIterateArtifact}
              onSesionAttached={handleSesionAttached}
              onBackToVerification={() => setStep('verify')}
              onStartNewSession={handleStartNewSession}
              onUpdateMiniApp={handleUpdateMiniApp}
              onRetoPublished={handleRetoPublished}
            />
          )}
        </>
      )}

      {activeSection === 'artefactos' && (
        <ArtefactosPanel
          items={artefactosItems}
          isLoading={artefactosLoading}
          errorMessage={artefactosError}
          onRefresh={() => void loadArtefactos()}
          onOpenArtefacto={handleOpenArtefacto}
          onDelete={handleDeleteArtefacto}
        />
      )}

      {activeSection === 'libreta' && (
        <LibretaErroresPanel
          items={libretaItems}
          isLoading={libretaLoading}
          errorMessage={libretaError}
          onRefresh={() => void loadLibreta()}
          onChangeEstado={handleChangeLibretaEstado}
          onDelete={handleDeleteLibretaItem}
          onCreateManual={handleCreateManualLibreta}
        />
      )}

      {activeSection === 'retos' && (
        <RetosHistoryPanel
          items={retosItems}
          isLoading={retosLoading}
          errorMessage={retosError}
          onRefresh={() => void loadRetos()}
          onDelete={handleDeleteReto}
        />
      )}
    </TeacherLayout>
  );
}
