//
// copyright (c) Microsoft. All rights reserved.
// See https://aka.ms/csspeech/license201809 for the full license information.
//
import {
    CognitiveSubscriptionKeyAuthentication,
    CognitiveTokenAuthentication,
    Context,
    Device,
    IAuthentication,
    IConnectionFactory,
    OS,
    PlatformConfig,
    RecognitionMode,
    RecognizerConfig,
    ServiceRecognizerBase,
} from "../common.speech/Exports";
import {
    Promise,
    PromiseHelper,
} from "../common/Exports";
import { Contracts } from "./Contracts";
import {
    AudioConfig,
    PropertyCollection,
    PropertyId,
    RecognitionEventArgs,
    SessionEventArgs,
    SpeechRecognitionResult,
} from "./Exports";

/**
 * Defines the base class Recognizer which mainly contains common event handlers.
 * @class Recognizer
 */
export abstract class Recognizer {
    private disposed: boolean;
    protected audioConfig: AudioConfig;

    /**
     * Creates and initializes an instance of a Recognizer
     * @constructor
     * @param {AudioConfig} audioInput - An optional audio input stream associated with the recognizer
     */
    protected constructor(audioConfig: AudioConfig) {
        this.audioConfig = (audioConfig !== undefined) ? audioConfig : AudioConfig.fromDefaultMicrophoneInput();

        this.disposed = false;
    }

    /**
     * Defines event handler for session started events.
     * @member Recognizer.prototype.sessionStarted
     * @function
     * @public
     */
    public sessionStarted: (sender: Recognizer, event: SessionEventArgs) => void;

    /**
     * Defines event handler for session stopped events.
     * @member Recognizer.prototype.sessionStopped
     * @function
     * @public
     */
    public sessionStopped: (sender: Recognizer, event: SessionEventArgs) => void;

    /**
     * Defines event handler for speech started events.
     * @member Recognizer.prototype.speechStartDetected
     * @function
     * @public
     */
    public speechStartDetected: (sender: Recognizer, event: RecognitionEventArgs) => void;

    /**
     * Defines event handler for speech stopped events.
     * @member Recognizer.prototype.speechEndDetected
     * @function
     * @public
     */
    public speechEndDetected: (sender: Recognizer, event: RecognitionEventArgs) => void;

    /**
     * Dispose of associated resources.
     * @member Recognizer.prototype.close
     * @function
     * @public
     */
    public close(): void {
        Contracts.throwIfDisposed(this.disposed);

        this.dispose(true);
    }

    /**
     * This method performs cleanup of resources.
     * The Boolean parameter disposing indicates whether the method is called from Dispose (if disposing is true) or from the finalizer (if disposing is false).
     * Derived classes should override this method to dispose resource if needed.
     * @member Recognizer.prototype.dispose
     * @function
     * @public
     * @param {boolean} disposing - Flag to request disposal.
     */
    protected dispose(disposing: boolean): void {
        if (this.disposed) {
            return;
        }

        if (disposing) {
            // disconnect
        }

        this.disposed = true;
    }

    //
    // ################################################################################################################
    // IMPLEMENTATION.
    // Move to independent class
    // ################################################################################################################
    //

    protected abstract CreateRecognizerConfig(speecgConfig: PlatformConfig, recognitionMode: RecognitionMode): RecognizerConfig;

    protected abstract CreateServiceRecognizer(authentication: IAuthentication, connectionFactory: IConnectionFactory, audioConfig: AudioConfig, recognizerConfig: RecognizerConfig): ServiceRecognizerBase;

    // Setup the recognizer
    protected implRecognizerSetup(recognitionMode: RecognitionMode, speechProperties: PropertyCollection, audioConfig: AudioConfig, speechConnectionFactory: IConnectionFactory): ServiceRecognizerBase {

        let osPlatform = (window !== undefined) ? "Browser" : "Node";
        let osName = "unknown";
        let osVersion = "unknown";

        if (navigator !== undefined) {
            osPlatform = osPlatform  + "/" + navigator.platform;
            osName = navigator.userAgent;
            osVersion = navigator.appVersion;
        }

        const recognizerConfig = this.CreateRecognizerConfig(
            new PlatformConfig(
                new Context(new OS(osPlatform, osName, osVersion))),
            recognitionMode); // SDK.SpeechResultFormat.Simple (Options - Simple/Detailed)

        const subscriptionKey = speechProperties.getProperty(PropertyId.SpeechServiceConnection_Key, undefined);
        const authentication = subscriptionKey ?
            new CognitiveSubscriptionKeyAuthentication(subscriptionKey) :
            new CognitiveTokenAuthentication(
                (authFetchEventId: string): Promise<string> => {
                    const authorizationToken = speechProperties.getProperty(PropertyId.SpeechServiceAuthorization_Token, undefined);
                    return PromiseHelper.FromResult(authorizationToken);
                },
                (authFetchEventId: string): Promise<string> => {
                    const authorizationToken = speechProperties.getProperty(PropertyId.SpeechServiceAuthorization_Token, undefined);
                    return PromiseHelper.FromResult(authorizationToken);
                });

        return this.CreateServiceRecognizer(
            authentication,
            speechConnectionFactory,
            audioConfig,
            recognizerConfig);
    }

    // Start the recognition
    protected implRecognizerStart(
        recognizer: ServiceRecognizerBase,
        successCallback: (e: SpeechRecognitionResult) => void,
        errorCallback: (e: string) => void,
        speechContext?: string,
    ): void {
        recognizer.Recognize(speechContext, successCallback, errorCallback).On(
            /* tslint:disable:no-empty */
            (result: boolean): void => { },
            (error: string): void => {
                if (!!errorCallback) {
                    // Internal error with service communication.
                    errorCallback("Runtime error: " + error);
                }
            });
    }
}
